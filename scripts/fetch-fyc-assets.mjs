/**
 * Build-time fetcher for FYC lyric-sheet images (Sprint 11 rewrite).
 *
 * Reads each FYC campaign's ACF `lyric_sheets` gallery from WordPress (the
 * pages Meg edits), downloads every image into public/images/fyc/, and writes
 * public/images/fyc/manifest.json mapping WP page id → local sheets
 * ({src, alt, width, height}) for src/lib/fyc-content.ts to read.
 *
 * Runs first in `npm run build` (deploy.yml builds on the GHA runner, which
 * reaches admin.megcmusic.com). Downloads the original upload (Jetpack Photon
 * rewrites the named renditions down to 525px, softer than the 1024px files
 * the page shipped before this rewrite — the original is 1400px, same square
 * ratio). Validates image magic bytes and a sane minimum size; ANY failure
 * exits non-zero listing every miss — a build that cannot read WP fails
 * loudly and the previous deploy stays live. An EMPTY gallery is content,
 * not failure: the manifest records [] and the page omits the section.
 *
 * Zero dependencies (Node 18+ global fetch). Safe to re-run — files are
 * simply overwritten.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ORIGIN = process.env.NEXT_PUBLIC_WP_ORIGIN ?? "https://admin.megcmusic.com";
const API = process.env.WP_API_URL ?? `${ORIGIN}/wp-json/wp/v2`;
const OUT_DIR = path.join(process.cwd(), "public", "images", "fyc");

/** Campaign WP pages carrying the FYC field group — mirrors FYC_PAGE_IDS in
 *  src/lib/fyc-content.ts. */
const FYC_PAGE_IDS = [4350, 4566];

const MIN_BYTES = 10_000;
const MAGIC = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
};

function looksLikeImage(buf) {
  const isPng = MAGIC.png.every((b, i) => buf[i] === b);
  const isJpg = MAGIC.jpg.every((b, i) => buf[i] === b);
  return isPng || isJpg;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const failures = [];
  const manifest = {};

  for (const pageId of FYC_PAGE_IDS) {
    let gallery;
    try {
      const page = await fetchJson(`${API}/pages/${pageId}?acf_format=standard&_fields=acf.lyric_sheets`);
      const raw = page?.acf?.lyric_sheets;
      gallery = Array.isArray(raw) ? raw : []; // ACF returns false for an empty gallery
    } catch (e) {
      failures.push(`page ${pageId}: could not read lyric_sheets — ${e.message}`);
      continue;
    }

    const sheets = [];
    for (let i = 0; i < gallery.length; i++) {
      const item = gallery[i];
      const src = item?.url;
      const width = item?.width ?? 1024;
      const height = item?.height ?? 1024;
      const ext = String(src ?? "").toLowerCase().includes(".jpg") ? "jpg" : "png";
      const name = `lyric-${pageId}-${String(i + 1).padStart(2, "0")}.${ext}`;
      if (!src) {
        failures.push(`page ${pageId} sheet ${i + 1}: gallery item has no url`);
        continue;
      }
      try {
        const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < MIN_BYTES) throw new Error(`only ${buf.length} bytes`);
        if (!looksLikeImage(buf)) throw new Error("not a PNG/JPEG (magic bytes)");
        await writeFile(path.join(OUT_DIR, name), buf);
        sheets.push({
          src: `/images/fyc/${name}`,
          alt: item?.alt ?? "",
          width,
          height,
        });
        console.log(`fetched ${name} (${buf.length} bytes) ← ${src}`);
      } catch (e) {
        failures.push(`page ${pageId} sheet ${i + 1} (${src}): ${e.message}`);
      }
    }
    manifest[String(pageId)] = sheets;
  }

  if (failures.length) {
    console.error(`FYC asset fetch FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const counts = Object.entries(manifest)
    .map(([id, s]) => `${id}:${s.length}`)
    .join(", ");
  console.log(`wrote manifest.json (${counts})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
