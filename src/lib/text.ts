/**
 * HTML-entity decoding for WordPress / The Events Calendar REST fields.
 *
 * WP serves titles and venue names with entities baked in — numeric
 * (`&#8211;` → "–", `&#038;` → "&") and a handful of named ones (`&amp;`,
 * `&#38;`) — because they come from post content, not a JSON-clean field.
 * React renders any string literally, so an entity shows raw on the page.
 * Dependency-free by design: a small named-entity table covers what WP
 * actually emits, and a numeric pass handles the rest (decimal + hex).
 */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

const ENTITY_RE = /&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi;

/** Decode HTML entities in a WP-sourced string. Non-string / empty passes through. */
export function decodeEntities(input: string | undefined | null): string {
  if (!input) return input ?? "";
  return input.replace(ENTITY_RE, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      // Reject NaN and out-of-range code points; leave the raw entity in place.
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
    const named = NAMED[body.toLowerCase()];
    return named ?? match;
  });
}
