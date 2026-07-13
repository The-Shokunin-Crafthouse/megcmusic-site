/**
 * Resolve a release's cover art from Meg's WordPress, browser-side. The WP host
 * blocks datacenter IPs, so the server can't read covers at build/ISR — the
 * visitor's residential IP can, and WP REST echoes the request origin for CORS
 * (same pattern as the photo/video galleries).
 *
 * Source order, per Levi's call: the release PAGE's Featured Image first (admin →
 * Pages → [release] → Featured Image), then the Shop PRODUCT image (admin →
 * Products → [release] → Product image). Returns null when neither exists, and
 * the row keeps its titled placeholder.
 *
 * Results are memoised in-process (so multiple rows / re-renders share one fetch)
 * and cached in sessionStorage (so navigating between pages doesn't refetch).
 */
import { WP_ORIGIN } from "@/lib/wp-origin";

const WP_API_URL = `${WP_ORIGIN}/wp-json/wp/v2`;
const TIMEOUT_MS = 15_000;

const inflight = new Map<string, Promise<string | null>>();
const cacheKey = (key: string) => `mc-cover-${key}`;

/** The Featured Image URL of a `pages` or `product` item by slug, or null. */
async function featuredImageUrl(
  type: "pages" | "product",
  slug: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${WP_API_URL}/${type}?slug=${encodeURIComponent(slug)}&_fields=featured_media`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ featured_media?: number }>;
    const mediaId = rows[0]?.featured_media;
    if (!mediaId) return null;
    const media = await fetch(
      `${WP_API_URL}/media/${mediaId}?_fields=source_url`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!media.ok) return null;
    const json = (await media.json()) as { source_url?: string };
    return json.source_url ?? null;
  } catch {
    return null;
  }
}

/** Resolve one release's cover; page image first, then product image. */
export function resolveReleaseCover(
  pageSlug?: string,
  productSlug?: string,
): Promise<string | null> {
  const key = pageSlug || productSlug || "";
  if (!key) return Promise.resolve(null);
  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    try {
      const cached = sessionStorage.getItem(cacheKey(key));
      if (cached !== null) return cached || null; // "" = resolved-but-none
    } catch {
      /* private mode — fall through to a live fetch */
    }
    let url: string | null = null;
    if (pageSlug) url = await featuredImageUrl("pages", pageSlug);
    if (!url && productSlug) url = await featuredImageUrl("product", productSlug);
    try {
      sessionStorage.setItem(cacheKey(key), url ?? "");
    } catch {
      /* ignore */
    }
    return url;
  })();

  inflight.set(key, run);
  return run;
}
