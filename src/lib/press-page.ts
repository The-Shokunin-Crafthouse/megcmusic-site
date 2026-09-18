/**
 * A WordPress "press" page — one of Meg's review pages (e.g. "Reviews: Shadows
 * of a Ghost Town"), absorbed into the site on 2026-09-17 as
 * /music/<release>/reviews. Its body is a list of outlet links, sometimes a
 * blockquote, sometimes an image. Rendered as typed blocks, never as raw
 * HTML: paragraphs keep their links as runs (http(s) only), a blockquote
 * becomes a quote with its cite as attribution, an image goes through the
 * gallery's URL rules (media-photos). Everything else is dropped.
 */

import { parsePhotos } from "@/lib/media-photos";

export type PressRun = { text: string; href?: string };
export type PressBlock =
  | { type: "paragraph"; runs: PressRun[] }
  | { type: "quote"; text: string; attribution: string }
  | { type: "image"; src: string; alt: string };

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&#8217;": "’", "&#8216;": "‘",
  "&#8220;": "“", "&#8221;": "”", "&#8211;": "–", "&#8212;": "—", "&nbsp;": " ", "&hellip;": "…",
};
const decode = (s: string): string => s.replace(/&(?:amp|lt|gt|quot|#039|#8217|#8216|#8220|#8221|#8211|#8212|nbsp|hellip);/g, (m) => ENTITIES[m] ?? m);
const strip = (s: string): string => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const safeHref = (h: string): string | undefined => (/^https?:\/\//i.test(h) ? decode(h) : undefined);

/** Text with its anchors kept as runs; adjacent plain text merged. */
function runs(inner: string): PressRun[] {
  const out: PressRun[] = [];
  const push = (r: PressRun) => {
    const last = out[out.length - 1];
    if (last && !last.href && !r.href) last.text += r.text;
    else out.push(r);
  };
  const re = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let i = 0;
  for (const m of inner.matchAll(re)) {
    const before = strip(inner.slice(i, m.index));
    if (before) push({ text: before });
    const text = strip(m[2]).trim();
    const href = safeHref(m[1]);
    if (text) push(href ? { text, href } : { text });
    i = (m.index ?? 0) + m[0].length;
  }
  const tail = strip(inner.slice(i));
  if (tail) push({ text: tail });
  return out.map((r, k) => ({ ...r, text: k === 0 ? r.text.replace(/^\s+/, "") : r.text })).map((r, k, a) => (k === a.length - 1 ? { ...r, text: r.text.replace(/\s+$/, "") } : r)).filter((r) => r.text);
}

/** Strip the curly or straight quote marks a quote was typed with — the
 *  panel adds its own. */
const unquote = (s: string): string => s.replace(/^[\s“"]+|[\s”"]+$/g, "").trim();

export function parsePressPage(html: string): PressBlock[] {
  if (!html) return [];
  const out: PressBlock[] = [];
  const re = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>|<figure\b[^>]*>([\s\S]*?)<\/figure>|<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) {
      // The quote is the first paragraph; the attribution is the <cite> when
      // there is one, else the shorter paragraphs that follow it inside the
      // blockquote (the block editor's habit: name, then title, each its own
      // <p>), joined with the site's " · ".
      const cite = /<cite\b[^>]*>([\s\S]*?)<\/cite>/i.exec(m[1]);
      const body = m[1].replace(/<cite\b[^>]*>[\s\S]*?<\/cite>/gi, "");
      const paras = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => strip(p[1]).trim()).filter(Boolean);
      const [first, ...rest] = paras.length ? paras : [strip(body).trim()];
      const text = unquote(first ?? "");
      const attribution = cite ? strip(cite[1]).trim() : rest.join(" · ");
      if (text) out.push({ type: "quote", text, attribution });
      // The block editor nests a gallery inside the quote when the image was
      // added while the quote was selected; it still reads as the page's image.
      for (const photo of parsePhotos(m[1])) out.push({ type: "image", src: photo.full, alt: photo.alt });
    } else if (m[2] !== undefined) {
      for (const photo of parsePhotos(m[2])) out.push({ type: "image", src: photo.full, alt: photo.alt });
    } else {
      const r = runs(m[3]);
      if (r.length) out.push({ type: "paragraph", runs: r });
    }
  }
  return out;
}
