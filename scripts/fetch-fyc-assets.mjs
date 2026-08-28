/**
 * One-shot fetcher for the Shadows of a Ghost Town FYC lyric sheets.
 *
 * Downloads the 11 lyric images from the original WordPress install into
 * public/images/fyc/ under the exact names src/config/fyc.ts lists
 * (lyric-01.png … lyric-11.png). Tries the WP install's own docroot on the
 * admin subdomain first, then the wp.com CDN cache of the pre-migration URL.
 *
 * Run once locally (needs open egress — the cloud sandboxes can't reach the
 * WP subdomain, which is why this script exists):
 *
 *   node scripts/fetch-fyc-assets.mjs
 *
 * Zero dependencies (Node 18+ global fetch). Validates PNG magic bytes and
 * a sane minimum size; exits non-zero listing every failure. Safe to re-run —
 * files are simply overwritten.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUT_DIR = path.join(process.cwd(), "public", "images", "fyc");

/** WP media filenames in page order (Lyrics section of the source page). */
const WP_FILES = [
  "5-1",
  "6-1",
  "7-1",
  "8-1",
  "9-1",
  "10-1",
  "11-1",
  "12",
  "13-1",
  "14-1",
  "15-1",
];

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const MIN_BYTES = 10_000;

function sourcesFor(wpName) {
  const file = `${wpName}-1024x1024.png`;
  return [
    `https://admin.megcmusic.com/wp-content/uploads/2025/07/${file}`,
    `https://i0.wp.com/www.megcmusic.com/wp-content/uploads/2025/07/${file}?ssl=1`,
  ];
}

async function fetchOne(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error(`suspiciously small (${buf.length} bytes)`);
  if (!buf.subarray(0, 4).equals(PNG_MAGIC)) throw new Error("not a PNG (magic bytes)");
  return buf;
}

await mkdir(OUT_DIR, { recursive: true });

const failures = [];
for (let i = 0; i < WP_FILES.length; i++) {
  const localName = `lyric-${String(i + 1).padStart(2, "0")}.png`;
  const attempts = [];
  let saved = false;
  for (const url of sourcesFor(WP_FILES[i])) {
    try {
      const buf = await fetchOne(url);
      await writeFile(path.join(OUT_DIR, localName), buf);
      console.log(`ok  ${localName}  ${(buf.length / 1024).toFixed(0)} KB  <- ${url}`);
      saved = true;
      break;
    } catch (err) {
      attempts.push(`${url} -> ${err.message}`);
    }
  }
  if (!saved) failures.push({ localName, attempts });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${WP_FILES.length} downloads FAILED:`);
  for (const f of failures) {
    console.error(`  ${f.localName}`);
    for (const a of f.attempts) console.error(`    ${a}`);
  }
  process.exit(1);
}

console.log(`\nAll ${WP_FILES.length} lyric sheets saved to public/images/fyc/`);
