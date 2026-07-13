/**
 * Pull YouTube video IDs out of Meg's WP Videos page — the embeds in the page
 * body (her curated list) and the ACF `featured_video_url` field (the always-on
 * main video). Pure + regex-only so it runs identically on the server (build/ISR)
 * and in the browser fallback when the WP host blocks the datacenter IP.
 *
 * She manages both in one place: admin → Pages → "Videos" → the YouTube blocks
 * (the list) and the "Featured Video URL" field (the main tile). See videos.ts.
 */

/** The single 11-char YouTube id inside a watch/share/embed URL, or a bare id. */
export function youTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
}

/** Every YouTube id embedded in a WP page's rendered HTML, in order, de-duped. */
export function parseVideoIds(html: string): string[] {
  if (!html) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(?:watch\?v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/g;
  for (const m of html.matchAll(re)) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** What Meg's Videos page contributes: the featured id + her curated list. */
export interface VideosSource {
  featuredId: string | null;
  ids: string[];
}
