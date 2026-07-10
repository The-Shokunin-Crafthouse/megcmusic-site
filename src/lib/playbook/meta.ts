/**
 * Meta Graph API client for the Instagram Business Account media + insights
 * sync (Sprint 09). Server-only — reads `META_SYSTEM_USER_TOKEN`, a
 * non-expiring System User token (2026-07-10 ADR: "System User token over
 * Instagram Login"). There is no refresh flow to build; the only failure
 * mode is revocation, surfaced as an OAuth error (code 190) — see
 * `isAuthError()`.
 *
 * UNVERIFIED LIVE (PLAN.md §0/§10): the metric list below and the
 * pre-business-media error classification in `isPreBusinessMediaError()` are
 * the plan's documented best-known set, not yet confirmed against a live
 * insights call. A single bad metric name 400s the whole insights call for
 * that media, but never the run — every call site treats one media's
 * insights failure as non-fatal (log + continue), so an unverified list is
 * safe to ship; it just needs a throwaway-script pass against the live
 * account (and possibly per-product_type adjustment here) before the metric
 * set is considered frozen.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Instagram Business Account ID, resolved from Page ID 108048260606098 and
 *  verified live 2026-07-10 (decisions.md — Meta Graph API access ADR). */
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
  isAuthError: boolean;
}

function graphError(message: string, code?: number): GraphApiError {
  const error = new Error(message) as GraphApiError;
  error.code = code;
  error.isAuthError = code === 190;
  return error;
}

/** True for a revoked/rotated token (OAuth error code 190) — the one
 *  failure mode the non-expiring System User token has (§3). */
export function isAuthError(error: unknown): boolean {
  return error instanceof Error && (error as GraphApiError).isAuthError === true;
}

/** Best-known proxy for "Instagram has no insights for media posted before
 *  the account became a Business account" (§3 backfill spec). Graph API
 *  does not document a single stable code for this; treat any non-auth
 *  insights failure as this case for now — precise enough for backfill's
 *  purpose (mark once, never retry), refine once real error payloads from a
 *  live run are seen. */
export function isPreBusinessMediaError(error: unknown): boolean {
  return error instanceof Error && !isAuthError(error);
}

async function graphFetch(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const apiError = body?.error as
      | { message?: string; code?: number }
      | undefined;
    throw graphError(
      apiError?.message ?? `Graph API ${res.status} ${res.statusText}`,
      apiError?.code,
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

/** Working metric set per PLAN.md §0 — `impressions` is deprecated in favor
 *  of `views` (Graph API v21+). STORY is absent by design: sync v1 excludes
 *  Stories (24h lifespan, thin insights — §10 open item, default: exclude).
 */
const METRICS_BY_PRODUCT_TYPE: Partial<Record<string, readonly string[]>> = {
  FEED: ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions"],
  REELS: ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions"],
};

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
