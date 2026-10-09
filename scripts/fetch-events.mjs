/**
 * Build-time read of every show into src/generated/wp-content/events.json, so
 * home and /shows render their lists in the server HTML.
 *
 * Why a prebuild step: the Vercel runtime cannot reach admin.megcmusic.com
 * (decisions.md, 2026-09-06), so the pages' own fetch came back empty and every
 * visitor waited on a 9-request archive fetch from their browser before any
 * show appeared. The runner can reach WordPress, so the read happens here once.
 *
 * Fails SOFT, unlike fetch-wp-content.mjs: an unreadable archive logs a
 * workflow warning and leaves the committed snapshot in place. The browser
 * still refreshes upcoming shows on load, so a TEC outage costs freshness of
 * the past list, never a blocked deploy (decisions.md, 2026-10-08).
 *
 * The written file is COMMITTED so `next dev` and `tsc` work without a build.
 * It is generated; never hand-edit it. Run: node scripts/fetch-events.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fetchArchive } from "./lib/events-archive.mjs";

// Same guard as src/lib/wp-origin.ts: the Vercel env can deliver the origin
// set-but-empty.
const DEFAULT_ORIGIN = "https://admin.megcmusic.com";
function validOrigin(value) {
  if (!value) return DEFAULT_ORIGIN;
  try {
    new URL(value);
    return value;
  } catch {
    return DEFAULT_ORIGIN;
  }
}
const ORIGIN = validOrigin(process.env.NEXT_PUBLIC_WP_ORIGIN);
const OUT = path.join(process.cwd(), "src", "generated", "wp-content", "events.json");

try {
  const events = await fetchArchive(ORIGIN);
  if (!events.length) throw new Error("the archive came back empty");
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(events) + "\n");
  console.log(`wrote src/generated/wp-content/events.json (${events.length} shows)`);
} catch (e) {
  console.log(
    `::warning title=Shows archive not refreshed::${ORIGIN} events could not be read ` +
      `(${e.message}). Deploying the committed snapshot; browsers still refresh upcoming shows.`,
  );
}
