/**
 * Parse downloadable press assets out of the live /press-kit page HTML, so Meg
 * swaps a PDF in WordPress and the EPK route follows with zero code change. Today
 * the page holds none, so this returns an empty list and the route shows the
 * named-kit "coming soon" rows from config; the moment a PDF/doc is linked on the
 * page it surfaces here as a real download.
 *
 * Pure + regex-only (no DOM, no node deps) so it runs identically on the server
 * (build/ISR) and in the browser fallback when the WP host blocks the datacenter.
 */
export interface EpkAsset {
  label: string;
  href: string;
  /** File kind, upper-cased for the row badge (PDF, DOC, ZIP). */
  kind: string;
}

const FILE_RE = /\.(pdf|docx?|zip|key|pages)(?:$|[?#])/i;

/** Decode the handful of entities WordPress emits inside href/anchor text. */
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"');
}

function labelFromHref(href: string): string {
  const file = decode(href).split(/[?#]/)[0].split("/").pop() ?? "Download";
  return file
    .replace(FILE_RE, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Download";
}

/**
 * Every anchor pointing at a downloadable file, de-duplicated by href, in page
 * order. Anchor text wins as the label; falls back to a cleaned filename.
 */
export function parseDownloadableAssets(html: string): EpkAsset[] {
  if (!html) return [];
  const out: EpkAsset[] = [];
  const seen = new Set<string>();
  const anchor = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const m of html.matchAll(anchor)) {
    const href = decode(m[1]);
    const ext = href.match(FILE_RE);
    if (!ext || seen.has(href)) continue;
    seen.add(href);

    const text = decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    out.push({
      label: text || labelFromHref(href),
      href,
      kind: ext[1].toUpperCase().replace("DOCX", "DOC"),
    });
  }
  return out;
}
