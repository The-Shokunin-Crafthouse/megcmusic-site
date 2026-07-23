/**
 * Parse Meg's WP "Sample Set List" page into groups of songs. The page is a flat
 * list — a group header ("Covers", "Originals") followed by lines shaped
 * "Song Title (Original Artist)". Pure + regex-only so it runs on the server
 * (build/ISR) and in the browser fallback when the WP host blocks the datacenter.
 */
export interface SetSong {
  title: string;
  /** Original artist (for covers); "" for originals or when absent. */
  artist: string;
}

export interface SetGroup {
  heading: string;
  songs: SetSong[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&#039;": "'",
  "&#8217;": "’",
  "&#8216;": "‘",
  "&nbsp;": " ",
};

function decode(s: string): string {
  return s
    .replace(/&(?:amp|#039|#8217|#8216|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADER_WORDS = /^(covers?|originals?|set ?list|encore|acoustic|full band)$/i;

/** A block is a group header only if it's a known section word, or WordPress
 *  marked it as one — a heading tag or a `<p>` that is entirely `<strong>`.
 *  Never treat a short line as a header: her originals have no "(Artist)" tail
 *  and are often two or three words ("Desert Run"), so the length heuristic
 *  would wrongly split the Originals list into fake sections. */
function isHeaderBlock(block: string, line: string): boolean {
  if (/^<h[1-6]\b/i.test(block)) return true;
  if (/^<p[^>]*>\s*<strong>[\s\S]*<\/strong>\s*<\/p>\s*$/i.test(block)) return true;
  return HEADER_WORDS.test(line);
}

function toSong(line: string): SetSong {
  const m = line.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim() };
  return { title: line, artist: "" };
}

export function parseSetList(html: string): SetGroup[] {
  if (!html) return [];
  const blocks = html.match(/<(?:p|li|h[1-6]|strong)\b[^>]*>[\s\S]*?<\/(?:p|li|h[1-6]|strong)>/gi) ?? [];
  const groups: SetGroup[] = [];
  let current: SetGroup | null = null;

  for (const block of blocks) {
    const line = decode(block);
    if (!line) continue;
    if (isHeaderBlock(block, line)) {
      current = { heading: line, songs: [] };
      groups.push(current);
    } else {
      if (!current) {
        current = { heading: "Set List", songs: [] };
        groups.push(current);
      }
      current.songs.push(toSong(line));
    }
  }
  return groups.filter((g) => g.songs.length > 0);
}
