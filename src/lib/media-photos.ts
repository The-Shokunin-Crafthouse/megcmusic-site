/**
 * Parse Meg's photo gallery out of the live WP /photos page HTML. The images are
 * served from wp.com's Photon CDN (i0.wp.com), so we normalise each to its
 * original file and request sized renditions with `?w=` — a small tile for the
 * grid and a large one for the lightbox — instead of shipping the full-res files.
 *
 * Pure + regex-only so it runs identically on the server (build/ISR) and in the
 * browser fallback when the WP host blocks the datacenter IP.
 */
export interface Photo {
  /** Grid tile (square-cropped by CSS). */
  thumb: string;
  /** Full-view rendition for the lightbox. */
  full: string;
  alt: string;
}

/** Strip the query and any WordPress `-1024x683` size suffix to reach the original. */
function normalize(src: string): string {
  const noQuery = src.split(/[?#]/)[0];
  return noQuery.replace(/-\d+x\d+(?=\.[a-z]+$)/i, "");
}

function sized(base: string, w: number): string {
  return `${base}?w=${w}&quality=82&ssl=1`;
}

/**
 * Every gallery image, de-duplicated by its original file (WordPress emits the
 * same photo at several sizes). Data URIs, tracking pixels, and non-content
 * images (emoji, avatars) are skipped.
 */
export function parsePhotos(html: string): Photo[] {
  if (!html) return [];
  const out: Photo[] = [];
  const seen = new Set<string>();
  const img = /<img\b[^>]*>/gi;

  for (const tag of html.match(img) ?? []) {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!/^https?:/i.test(src)) continue; // skip data: and relative
    if (!/\.(jpe?g|png|webp)(?:[?#]|$)/i.test(src)) continue;
    if (/(gravatar|emoji|s\.w\.org|avatar)/i.test(src)) continue;

    const base = normalize(src);
    if (seen.has(base)) continue;
    seen.add(base);

    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    const alt = (altMatch?.[1] ?? "").trim();
    out.push({
      thumb: sized(base, 720),
      full: sized(base, 1600),
      alt: alt || "Meghan Clarisse",
    });
  }
  return out;
}
