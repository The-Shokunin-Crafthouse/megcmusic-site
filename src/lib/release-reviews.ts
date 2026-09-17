/**
 * Press for a release (Sprint 16 Phase 2; supersedes src/config/reviews.ts):
 * the "Release Reviews" repeater on each release page, read at build by
 * scripts/fetch-releases.mjs into releases.json and parsed here.
 *
 * The page renders a QUOTE (in curly quotes) differently from an ACCOLADE (a
 * chart placement or an award line). The repeater has one text field for
 * both, so: Meg's `kind` decides when she sets it (plugin 1.4.1 adds the
 * select); a row saved before that field existed is sorted by shape — a
 * sourced sentence of six-plus words is a quote, and a placement (starting
 * with "#", a digit or "Top") or an unsourced line is an accolade. The
 * oracle test pins every current row to the style it rendered in before.
 */

export interface Review {
  /** Reviewer / outlet, used as the attribution line. */
  source: string;
  /** A short pulled line from the review. */
  quote?: string;
  /** A chart or list placement (shown as a badge-free accolade). */
  accolade?: string;
  /** Optional link to the full review / roundup. */
  href?: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const isUrl = (v: string): boolean => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

const PLACEMENT = /^(#|\d|top\b)/i;

function looksLikeQuote(body: string, source: string): boolean {
  if (!source) return false;
  if (PLACEMENT.test(body)) return false;
  return body.split(/\s+/).length >= 6;
}

export function parseReviews(raw: unknown): Review[] {
  if (!Array.isArray(raw)) return [];
  const out: Review[] = [];
  for (const row of raw) {
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const body = text(r.quote_or_accolade);
    if (!body) continue;
    const source = text(r.source);
    const kind = text(r.kind).toLowerCase();
    const quote = kind === "quote" ? true : kind === "accolade" ? false : looksLikeQuote(body, source);
    const link = text(r.link);
    out.push({
      source,
      ...(quote ? { quote: body } : { accolade: body }),
      ...(link && isUrl(link) ? { href: link } : {}),
    });
  }
  return out;
}
