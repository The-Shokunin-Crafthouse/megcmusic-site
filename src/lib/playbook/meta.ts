/**
 * Meta Graph API client for the Instagram Business Account media + insights
 * sync (Sprint 09). Server-only — reads `META_SYSTEM_USER_TOKEN`, a
 * non-expiring System User token (2026-07-10 ADR: "System User token over
 * Instagram Login"). There is no refresh flow to build; the only failure
 * mode is revocation, surfaced as an OAuth error (code 190) — see
 * `isAuthError()`.
 *
 * Metric list verified live 2026-07-10 against the real account via
 * scripts/playbook-backfill.ts: 4358 discovered, 1522 synced clean across
 * both FEED and REELS, 2836 marked unavailable — 100% of a sampled subset of
 * the unavailable set carried `error_subcode: 2108006`
 * ("Media Posted Before Business Account Conversion"), confirming
 * `isPreBusinessMediaError()` below.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Instagram Business Account ID (@meghanclarissecave), resolved from Page ID
 *  108048260606098 and verified live 2026-07-10 (decisions.md — Meta Graph
 *  API access ADR). Confirmed correct 2026-07-11 — do not confuse with
 *  @megcavemusic (17841400063028343), an old/secondary account. */
const IG_USER_ID = "17841401582839394";

const FETCH_TIMEOUT_MS = 10_000;

function accessToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error("META_SYSTEM_USER_TOKEN is not set.");
  }
  return token;
}

export interface GraphApiError extends Error {
  code?: number;
  subcode?: number;
  isAuthError: boolean;
}

function graphError(message: string, code?: number, subcode?: number): GraphApiError {
  const error = new Error(message) as GraphApiError;
  error.code = code;
  error.subcode = subcode;
  error.isAuthError = code === 190;
  return error;
}

/** True for a revoked/rotated token (OAuth error code 190) — the one
 *  failure mode the non-expiring System User token has (§3). */
export function isAuthError(error: unknown): boolean {
  return error instanceof Error && (error as GraphApiError).isAuthError === true;
}

/** True for "Instagram has no insights for media posted before the account
 *  became a Business account" — Meta's own error_user_title for
 *  `error_subcode: 2108006` on `code: 100` ("Invalid parameter"). Confirmed
 *  live 2026-07-10 against every sampled member of a 2836-media unavailable
 *  set during backfill — this media never gets insights, ever; mark once,
 *  never retry. */
export function isPreBusinessMediaError(error: unknown): boolean {
  return (
    error instanceof Error && (error as GraphApiError).subcode === 2108006
  );
}

const MAX_RETRIES = 1;

// fetch() only rejects on network/timeout (not HTTP status), so a retry here
// covers exactly the transient-slowness case — confirmed live: graph.facebook.com
// occasionally resets the connection on the first attempt (events.ts precedent).
async function rawFetch(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function graphFetch(url: string): Promise<Record<string, unknown>> {
  const res = await rawFetch(url);
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const apiError = body?.error as
      | { message?: string; code?: number; error_subcode?: number }
      | undefined;
    throw graphError(
      apiError?.message ?? `Graph API ${res.status} ${res.statusText}`,
      apiError?.code,
      apiError?.error_subcode,
    );
  }
  if (!body) throw graphError("Graph API returned an unparsable response.");
  return body;
}

export interface DiscoveredMedia {
  id: string;
  caption: string | null;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type: string; // FEED | REELS | STORY | AD
  permalink: string;
  thumbnail_url: string | null;
  media_url: string | null;
  timestamp: string;
}

/** The Graph API only populates `thumbnail_url` for VIDEO/REELS media —
 *  IMAGE and CAROUSEL_ALBUM come back with it null. Confirmed live
 *  2026-07-10: both return a usable static image in `media_url` instead
 *  (a carousel's `media_url` is its cover image). VIDEO's `media_url` is
 *  the raw .mp4, never a valid `<img>` source, so it's excluded from the
 *  fallback — VIDEO always has `thumbnail_url` set directly. */
export function displayThumbnail(item: DiscoveredMedia): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  return item.media_type === "VIDEO" ? null : item.media_url;
}

interface MediaPage {
  data: DiscoveredMedia[];
  paging?: { next?: string };
}

const DISCOVERY_FIELDS =
  "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp";

/** Pages the account's entire media history via `paging.next`, discovery
 *  only (no insights). A failed page throws and aborts the whole discovery —
 *  unlike a single media's insights, a broken discovery page means the sync
 *  can't trust it has seen every post, so step 5's "discovery failure aborts
 *  the run" rule applies here, not the per-post continue rule. */
export async function discoverAllMedia(): Promise<DiscoveredMedia[]> {
  let url: string | undefined =
    `${GRAPH_API_BASE}/${IG_USER_ID}/media?fields=${DISCOVERY_FIELDS}&limit=50&access_token=${accessToken()}`;
  const media: DiscoveredMedia[] = [];
  while (url) {
    const page = (await graphFetch(url)) as unknown as MediaPage;
    media.push(...(page.data ?? []));
    url = page.paging?.next;
  }
  return media;
}

export interface RecentMediaResult {
  media: DiscoveredMedia[];
  pages: number;
}

/** Pages media newest-first (the Graph API's default `/media` order,
 *  confirmed live), stopping once an entire page is older than `cutoffISO`
 *  — the daily sync only needs the active window, not full history (the
 *  2026-07-11 timeout ADR: full-history discovery of 4,358 media was
 *  consuming the whole 300s budget before the insights loop even started).
 *  A page straddling the cutoff is kept whole (cheap, avoids an off-by-one
 *  at the boundary) and paging stops after it. `discoverAllMedia` above is
 *  unchanged and remains for scripts/playbook-backfill.ts, which needs full
 *  history regardless of runtime. */
export async function discoverRecentMedia(
  cutoffISO: string,
): Promise<RecentMediaResult> {
  const cutoff = new Date(cutoffISO).getTime();
  let url: string | undefined =
    `${GRAPH_API_BASE}/${IG_USER_ID}/media?fields=${DISCOVERY_FIELDS}&limit=100&access_token=${accessToken()}`;
  const media: DiscoveredMedia[] = [];
  let pages = 0;
  while (url) {
    pages++;
    const page = (await graphFetch(url)) as unknown as MediaPage;
    const items = page.data ?? [];
    media.push(...items);
    const pageFullyPastCutoff =
      items.length > 0 &&
      items.every((item) => new Date(item.timestamp).getTime() < cutoff);
    if (pageFullyPastCutoff) break;
    url = page.paging?.next;
  }
  return { media, pages };
}

/** Refetches a single media node's discovery fields — used by the daily
 *  sync to refresh the CDN-backed `thumbnail_url` for the current top-5
 *  (Meta CDN URLs expire) without re-walking full media history every run. */
export async function getMediaNode(mediaId: string): Promise<DiscoveredMedia> {
  const url = `${GRAPH_API_BASE}/${mediaId}?fields=${DISCOVERY_FIELDS}&access_token=${accessToken()}`;
  return (await graphFetch(url)) as unknown as DiscoveredMedia;
}

/** Working metric set per PLAN.md §0 — `impressions` is deprecated in favor
 *  of `views` (Graph API v21+). STORY is absent by design: sync v1 excludes
 *  Stories (24h lifespan, thin insights — §10 open item, default: exclude).
 */
const METRICS_BY_PRODUCT_TYPE: Partial<Record<string, readonly string[]>> = {
  FEED: ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions"],
  REELS: ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions"],
};

/** Old-style `FEED`+`VIDEO` media (pre-Reels-consolidation, e.g. legacy
 *  IGTV-era posts) only supports `reach` — confirmed live 2026-07-10 via
 *  backfill against 11 media from 2022 ("The Media Insights API does not
 *  support the views, likes, comments, shares, total_interactions metric
 *  for this media product type", code 100, no subcode). Not worth a
 *  media_type-keyed table for 11 posts out of 4358 — retry once with this
 *  reduced set instead of failing the whole media. */
const FALLBACK_METRICS: readonly string[] = ["reach"];

function isUnsupportedMetricError(error: unknown): boolean {
  const err = error as GraphApiError;
  return (
    error instanceof Error &&
    err.code === 100 &&
    err.subcode === undefined &&
    error.message.includes("does not support")
  );
}

export interface MediaInsights {
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  total_interactions: number | null;
}

const EMPTY_INSIGHTS: MediaInsights = {
  reach: null,
  views: null,
  likes: null,
  comments: null,
  saved: null,
  shares: null,
  total_interactions: null,
};

/** Fetches insights for one media item. Returns `null` when `productType`
 *  is out of scope for sync v1 (STORY, or an unrecognized type) rather than
 *  calling the API at all. Throws on any Graph API failure — callers
 *  classify with `isAuthError`/`isPreBusinessMediaError` and continue past
 *  just this one post (§3 step 5). */
export async function getMediaInsights(
  mediaId: string,
  productType: string,
): Promise<MediaInsights | null> {
  const metrics = METRICS_BY_PRODUCT_TYPE[productType];
  if (!metrics) return null;

  try {
    return await fetchInsights(mediaId, metrics);
  } catch (err) {
    if (!isUnsupportedMetricError(err)) throw err;
    return await fetchInsights(mediaId, FALLBACK_METRICS);
  }
}

async function fetchInsights(
  mediaId: string,
  metrics: readonly string[],
): Promise<MediaInsights> {
  const url = `${GRAPH_API_BASE}/${mediaId}/insights?metric=${metrics.join(",")}&access_token=${accessToken()}`;
  const body = (await graphFetch(url)) as unknown as {
    data?: Array<{ name: string; values?: Array<{ value: unknown }> }>;
  };

  const result: MediaInsights = { ...EMPTY_INSIGHTS };
  for (const entry of body.data ?? []) {
    const value = entry.values?.[0]?.value;
    if (typeof value === "number" && entry.name in result) {
      (result as unknown as Record<string, number>)[entry.name] = value;
    }
  }
  return result;
}
