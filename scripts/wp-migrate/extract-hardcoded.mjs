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
 *
 * A surface drops out of this file as its Phase-3 PR lands and WordPress
 * becomes its source of truth (epk, media, poetry, home, music: 2026-09-06).
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

const booking = read("src/app/booking/page.tsx");
const shows = read("src/app/shows/page.tsx");
const shop = read("src/app/shop/page.tsx");

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

const out = {
  shows: {
    meta: meta(shows, "shows"),
    page_lede: one(shows, /className={styles\.lede}>\s*([^<]+)</, "shows lede"),
  },
  shop: {
    meta: meta(shop, "shop"),
    page_lede: one(shop, /className={styles\.lede}>\s*([^<]+)</, "shop lede"),
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
