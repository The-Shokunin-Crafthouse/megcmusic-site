/**
 * Extracts the hardcoded JSX strings that Phase 2 migrates into WordPress,
 * writing scripts/wp-migrate/hardcoded-strings.json. Run from the repo root:
 *
 *   node scripts/wp-migrate/extract-hardcoded.mjs
 *
 * Exists so the migration payload carries the exact bytes from the source
 * files (em dashes, curly quotes) instead of hand-transcribed copies. The
 * JSON is committed; re-run after any source-copy change before Phase 3
 * deletes these sources. JSX whitespace is collapsed to single spaces —
 * matching what the DOM renders.
 */

import { readFileSync, writeFileSync } from "node:fs";

const norm = (s) =>
  s
    .replace(/\s+/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
const read = (p) => readFileSync(p, "utf8");

function one(src, re, label) {
  const m = src.match(re);
  if (!m) throw new Error(`extract failed: ${label}`);
  return norm(m[1]);
}

const layout = read("src/app/layout.tsx");
const liner = read("src/components/LinerNotes/LinerNotes.tsx");
const newsletter = read("src/components/Newsletter/Newsletter.tsx");
const instagram = read("src/components/Instagram/Instagram.tsx");
const epk = read("src/app/epk/page.tsx");
const booking = read("src/app/booking/page.tsx");
const music = read("src/app/music/page.tsx");
const media = read("src/app/media/page.tsx");
const shows = read("src/app/shows/page.tsx");
const shop = read("src/app/shop/page.tsx");
const poetry = read("src/app/poetry/page.tsx");

const meta = (src, label) => ({
  title: one(src, /title:\s*"([^"]+)"/, `${label} meta title`),
  description: one(src, /description:\s*\n?\s*"([^"]+)"/, `${label} meta description`),
});

// booking facts/include arrays: [["Formats", "…"], …] and ["…", …]
const factRe = /{ label: "([^"]+)", value: "([^"]+)" }/g;
const bookingFacts = [...booking.matchAll(factRe)].map((m) => [m[1], m[2]]);
const bookingInclude = (booking.match(/WHAT_TO_INCLUDE\s*=\s*\[([^\]]+)\]/s) ||
  booking.match(/const\s+INCLUDE[^=]*=\s*\[([^\]]+)\]/s))?.[1]
  ?.match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1));
const epkFacts = [...epk.matchAll(factRe)].map((m) => [m[1], m[2]]);

const out = {
  home: {
    meta: meta(layout, "layout"),
    pull_quote: one(liner, /quoteText}>\s*[“"]([^”"]+)[”"]/, "pull quote"),
    pull_quote_attribution: one(liner, /<cite[^>]*>([^<]+)<\/cite>/, "quote attribution"),
    instagram_caption: one(instagram, />\s*(Follow along between shows —)/, "instagram caption"),
    newsletter_headline: one(newsletter, />(Postcards[^<]*)</, "newsletter headline"),
    newsletter_blurb: one(newsletter, />\s*(New shows,[^<]+)</, "newsletter blurb"),
    newsletter_birthday_note: one(newsletter, />\s*(I’ll send[^<]+)</, "birthday note"),
  },
  music: {
    meta: meta(music, "music"),
    page_lede: one(music, /className={styles\.lede}>\s*([^<]+)</, "music lede"),
  },
  media: {
    meta: meta(media, "media"),
    page_lede: one(media, /className={styles\.lede}>\s*([^<]+)</, "media lede"),
  },
  shows: {
    meta: meta(shows, "shows"),
    page_lede: one(shows, /className={styles\.lede}>\s*([^<]+)</, "shows lede"),
  },
  shop: {
    meta: meta(shop, "shop"),
    page_lede: one(shop, /className={styles\.lede}>\s*([^<]+)</, "shop lede"),
  },
  poetry: {
    meta: meta(poetry, "poetry"),
  },
  epk: {
    meta: meta(epk, "epk"),
    page_lede: one(epk, /className={styles\.lede}>\s*([^<]+)</, "epk lede"),
    facts: Object.fromEntries(epkFacts.map(([k, v]) => [k.toLowerCase(), v])),
    set_list_intro: one(epk, /setIntro}>\s*([^<]+)</, "set list intro"),
    resources_note: one(epk, /resourcesText}>\s*([^<]+)</, "resources note"),
  },
  booking: {
    meta: meta(booking, "booking"),
    page_lede: one(booking, /className={styles\.lede}>\s*([^<]+)</, "booking lede"),
    intro: one(booking, /introText}>\s*([^<]+)</, "booking intro"),
    include_items: bookingInclude,
    facts: Object.fromEntries(bookingFacts.map(([k, v]) => [k.toLowerCase(), v])),
  },
};

// Hard fail on any empty extraction — a silent miss would migrate a blank.
const assertFilled = (o, path = "") => {
  for (const [k, v] of Object.entries(o)) {
    if (v == null || (typeof v === "string" && !v.length))
      throw new Error(`empty extraction at ${path}${k}`);
    if (Array.isArray(v) && !v.length) throw new Error(`empty array at ${path}${k}`);
    if (typeof v === "object" && !Array.isArray(v)) {
      if (!Object.keys(v).length) throw new Error(`empty object at ${path}${k}`);
      assertFilled(v, `${path}${k}.`);
    }
  }
};
assertFilled(out);

writeFileSync("scripts/wp-migrate/hardcoded-strings.json", JSON.stringify(out, null, 2) + "\n");
console.log("wrote scripts/wp-migrate/hardcoded-strings.json");
