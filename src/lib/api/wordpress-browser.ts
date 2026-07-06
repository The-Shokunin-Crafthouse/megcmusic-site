/**
 * Browser-side WordPress page fetch — the fallback when the server render came
 * back empty because the WP host blocks datacenter IPs (CI / Vercel). The
 * visitor's residential IP can reach WP, and its REST CORS echoes the request
 * origin, so a plain cross-origin GET succeeds. Mirrors events-browser.ts.
 */
import { WP_ORIGIN } from "@/lib/wp-origin";

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
