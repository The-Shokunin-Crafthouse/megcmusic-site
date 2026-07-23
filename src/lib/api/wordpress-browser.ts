/**
 * Browser-side WordPress page fetch — the fallback when the server render came
 * back empty because the WP host blocks datacenter IPs (CI / Vercel). The
 * visitor's residential IP can reach WP, and its REST CORS echoes the request
 * origin, so a plain cross-origin GET succeeds. Mirrors events-browser.ts.
 */
import { WP_ORIGIN } from "@/lib/wp-origin";
import { parseVideoIds, youTubeId, type VideosSource } from "@/lib/media-videos";

const WP_API_URL = `${WP_ORIGIN}/wp-json/wp/v2`;
const TIMEOUT_MS = 15_000;

/** Fetch a single page's rendered HTML content by slug, or "" if unavailable. */
export async function fetchPageContentBrowser(slug: string): Promise<string> {
  try {
    const res = await fetch(
      `${WP_API_URL}/pages?slug=${encodeURIComponent(slug)}&_fields=content`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return "";
    const pages = (await res.json()) as Array<{ content?: { rendered?: string } }>;
    return pages[0]?.content?.rendered ?? "";
  } catch {
    return "";
  }
}

/**
 * Resolve Meg's live video source from her WP Videos page — the ACF featured URL
 * and the embeds in the page body. The WP host blocks datacenter IPs, so the
 * server can't read this at build/ISR; the visitor's residential IP can, and WP
 * REST echoes the request origin for CORS. Returns empty on any failure, so the
 * caller keeps its server-rendered (config + channel) list.
 */
export async function fetchVideosSourceBrowser(): Promise<VideosSource> {
  try {
    const res = await fetch(
      `${WP_API_URL}/pages?slug=videos&_fields=content,acf`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return { featuredId: null, ids: [] };
    const pages = (await res.json()) as Array<{
      content?: { rendered?: string };
      acf?: { featured_video_url?: string };
    }>;
    const page = pages[0];
    return {
      featuredId: youTubeId(page?.acf?.featured_video_url),
      ids: parseVideoIds(page?.content?.rendered ?? ""),
    };
  } catch {
    return { featuredId: null, ids: [] };
  }
}
