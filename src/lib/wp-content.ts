/**
 * Turn a WordPress `content.rendered` HTML blob into clean paragraph strings.
 * We render plain text (not the raw HTML) so untrusted markup never reaches the
 * DOM and the prose matches the comp's typographic treatment. Meg keeps editing
 * in WordPress; only her paragraph copy flows through.
 */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#8217;": "’",
  "&#8216;": "‘",
  "&#8220;": "“",
  "&#8221;": "”",
  "&#8211;": "–",
  "&#8212;": "—",
  "&nbsp;": " ",
  "&hellip;": "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#039|#8217|#8216|#8220|#8221|#8211|#8212|nbsp|hellip);/g, (m) => ENTITIES[m] ?? m);
}

export function paragraphsFromHtml(html: string): string[] {
  if (!html) return [];
  const blocks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  const source = blocks.length > 0 ? blocks : [html];
  return source
    .map((block) => decodeEntities(block.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}
