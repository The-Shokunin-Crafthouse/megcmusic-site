/**
 * Parse an image gallery out of live WP page HTML — Meg's /photos page and the
 * liner/lyric sheets on each release page. The images are served from wp.com's
 * Photon CDN (i0.wp.com), so we normalise each to its original file and request
 * sized renditions with `?w=` — a small tile for the grid and a large one for
 * the lightbox — instead of shipping the full-res files.
 *
 * Pure + regex-only so it runs identically on the server (build/ISR) and in the
 * browser fallback when the WP host blocks the datacenter IP.
 */
import { WP_ORIGIN } from "@/lib/wp-origin";

export interface Photo {
  /** Grid tile (square-cropped by CSS). */
  thumb: string;
  /** Full-view rendition for the lightbox. */
  full: string;
  alt: string;
}

/** The host WordPress serves uploads from today. */
const WP_HOST = new URL(WP_ORIGIN).hostname;

/** Every uploads URL carries `/wp-content/` — Photon after the origin host,
 *  a direct upload after the hostname. */
const UPLOADS = "/wp-content/";

/**
 * Point an uploads URL at the host WordPress actually serves from.
 *
 * A post body stores the `src` it was saved with. Meg's were saved before the
 * cutover, so they still read `www.megcmusic.com/wp-content/uploads/…` — an
 * origin the Next front-end now owns and which 403s every uploads path. Jetpack
 * rewrites `srcset` live (those attributes already read admin.megcmusic.com)
 * but never the stored `src`, so Photon is handed a host it cannot fetch and
 * answers 403 for every liner sheet on a release page.
 *
 * Photon carries the origin host as its first path segment
 * (`i0.wp.com/<host>/wp-content/…`); a direct upload carries it as the
 * hostname. Either way an uploads path on any host but WordPress's own is
 * stale, so it is rewritten rather than matched against a list of dead hosts —
 * the next origin move needs no second edit here.
 */
function rehost(src: string): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (!url.pathname.includes(UPLOADS)) return src;

  if (/(^|\.)wp\.com$/i.test(url.hostname)) {
    const rest = url.pathname.replace(/^\/[^/]+/, "");
    if (rest.startsWith(UPLOADS)) url.pathname = `/${WP_HOST}${rest}`;
  } else if (url.hostname !== WP_HOST) {
    url.protocol = "https:";
    url.hostname = WP_HOST;
  }
  return url.toString();
}

/** Strip the query and any WordPress `-1024x683` size suffix to reach the
 *  original, on the host that still serves it. */
function normalize(src: string): string {
  const noQuery = src.split(/[?#]/)[0];
  return rehost(noQuery.replace(/-\d+x\d+(?=\.[a-z]+$)/i, ""));
}

function sized(base: string, w: number): string {
  return `${base}?w=${w}&quality=82&ssl=1`;
}

/** A WordPress upload URL as the site serves images: on the WordPress host,
 *  original file, resized by Photon to `w`. Used by the photo block. */
export function photonUrl(src: string, w: number): string {
  return sized(normalize(src), w);
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
