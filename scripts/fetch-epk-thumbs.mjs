/**
 * Build-time press-kit thumbnails (ADR 2026-09-23).
 *
 * For each download in the press-kit rows (ACF `kit_items` on WP page 608,
 * already written to src/generated/wp-content/epk.json by fetch-wp-content.mjs),
 * downloads the file and renders its picture — the first page of a PDF, or
 * the uploaded image — into public/images/epk-thumbs/ (a gitignored build
 * artifact). src/generated/epk-thumbs.json maps each file's URL to its
 * pictures; the home page's Electronic Press Kit reads it. Every save of the
 * Press Kit rows rebuilds the site, so the picture always matches the file.
 *
 * Failure policy:
 * - A file that cannot be downloaded (after retries) fails the build with a
 *   named cause, like every other build-time WordPress read; the previous
 *   deploy stays live and the nightly rebuild tries again.
 * - A file that downloads but cannot be drawn (an encrypted or damaged PDF, or
 *   an error page served in its place) keeps the site photo for that row and
 *   prints a GitHub Actions warning naming the file. The picture is decoration;
 *   it does not hold back the rest of Meg's saves.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withRetry } from "./lib/retry.mjs";
import { thumbJobs, renderThumbs, manifestEntry, PUBLIC_DIR } from "./lib/epk-thumbs.mjs";

const EPK_JSON = path.join(process.cwd(), "src", "generated", "wp-content", "epk.json");
const OUT_DIR = path.join(process.cwd(), "public", ...PUBLIC_DIR.split("/").filter(Boolean));
const MANIFEST = path.join(process.cwd(), "src", "generated", "epk-thumbs.json");
const TIMEOUT_MS = 60_000;
const MAX_BYTES = 80 * 1024 * 1024;

const fail = (message) => {
  console.error(
    `epk-thumbs build failed: ${message}. Nothing is deployed; the previous production deploy stays live.`,
  );
  process.exit(1);
};

async function download(url) {
  return withRetry(async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error(`${bytes.length} bytes is over the ${MAX_BYTES}-byte limit`);
    return bytes;
  });
}

let rows;
try {
  rows = JSON.parse(readFileSync(EPK_JSON, "utf8")).kit_items;
} catch (e) {
  fail(`could not read ${path.relative(process.cwd(), EPK_JSON)} (run fetch-wp-content.mjs first) — ${e.message}`);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const manifest = {};
for (const job of thumbJobs(rows)) {
  let bytes;
  try {
    bytes = await download(job.url);
  } catch (e) {
    fail(`could not download the press-kit file ${job.url} — ${e.message}`);
  }
  try {
    for (const t of await renderThumbs(bytes, job.kind)) {
      writeFileSync(path.join(OUT_DIR, `${job.base}-${t.width}.webp`), t.webp);
    }
    manifest[job.url] = manifestEntry(job.base);
    console.log(`epk-thumbs: ${job.url} → ${manifest[job.url].src}`);
  } catch (e) {
    console.log(
      `::warning title=Press-kit thumbnail::Could not draw ${job.url} (${e.message}). ` +
        `That row keeps the site photo until the file is replaced.`,
    );
  }
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
console.log(`wrote src/generated/epk-thumbs.json (${Object.keys(sorted).length} thumbnail(s))`);
