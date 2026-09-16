/**
 * Build-time fetcher for FYC lyric-sheet images (Sprint 11 rewrite).
 *
 * Reads each FYC campaign's ACF `lyric_sheets` gallery from WordPress (the
 * pages Meg edits), downloads every image into public/images/fyc/, and writes
 * public/images/fyc/manifest.json mapping WP page id → local sheets
 * ({src, alt, width, height}) for src/lib/fyc-content.ts to read.
 *
 * Runs first in `npm run build` (deploy.yml builds on the GHA runner, which
 * reaches admin.megcmusic.com). Downloads each sheet at SHEET_WIDTH (Jetpack
 * Photon rewrites the named renditions down to 525px, softer than the 1024px
 * files the page shipped before the Sprint 11 rewrite — the upload is 1400px,
 * same square ratio, and that is what we keep).
 *
 * The width and quality are asked for explicitly rather than reusing the ACF
 * gallery URL: that URL carries `fit=1400,1400` and no quality, and Photon
 * answers it with PNG — 955 KB a sheet, ~11 MB across the section, discarding
 * the optimised JPEGs Meg uploaded. The same image asked for with a quality
 * comes back JPEG at ~347 KB. Each file is then named for the format its bytes
 * actually ARE, never for the extension in the URL — this library is served
 * through a WebP plugin and Photon transcodes on its own, so the two routinely
 * disagree. Validates image magic bytes and a sane minimum size; ANY failure exits
 * non-zero listing every miss — a build that cannot read WP fails loudly and
 * the previous deploy stays live. An EMPTY gallery is content, not failure:
 * the manifest records [] and the page omits the section.
 *
 * Zero dependencies (Node 18+ global fetch). Safe to re-run — the output
 * directory is emptied first.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Env overrides are used only when they parse as absolute URLs — the Vercel
// env delivers these set-but-invalid (runs 33989616503, 34045385710: fetch
// threw "Failed to parse URL" before any network I/O).
function urlOr(envName, fallback) {
  const v = process.env[envName];
  if (!v) return fallback;
  try {
    new URL(v);
    return v;
  } catch {
    console.warn(`${envName} is set but not an absolute URL — using ${fallback}`);
    return fallback;
  }
}
const ORIGIN = urlOr("NEXT_PUBLIC_WP_ORIGIN", "https://admin.megcmusic.com");
const API = urlOr("WP_API_URL", `${ORIGIN}/wp-json/wp/v2`);
const OUT_DIR = path.join(process.cwd(), "public", "images", "fyc");

/** Campaign WP pages carrying the FYC field group — mirrors FYC_PAGE_IDS in
 *  src/lib/fyc-content.ts. */
const FYC_PAGE_IDS = [4350, 4566];

const MIN_BYTES = 10_000;

/** Long edge of the stored sheet, and the rendition quality — the same 82 the
 *  photo/liner galleries request (src/lib/media-photos.ts). */
const SHEET_WIDTH = 1400;
const SHEET_QUALITY = 82;

/** Ask Jetpack/Photon for a width-and-quality-constrained rendition, dropping
 *  whatever sizing params the gallery URL carried so ours win. A non-Photon URL
 *  is returned untouched — it still loads, just at its stored size. */
function photonSheet(src) {
  let url;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (!/(^|\.)wp\.com$/i.test(url.hostname)) return src;
  for (const p of ["fit", "resize", "w", "h", "crop"]) url.searchParams.delete(p);
  url.searchParams.set("w", String(SHEET_WIDTH));
  url.searchParams.set("quality", String(SHEET_QUALITY));
  url.searchParams.set("ssl", "1");
  return url.toString();
}

/**
 * The extension the delivered BYTES deserve, or "" when they are not an image.
 *
 * Naming the file from the gallery URL instead is how public/images/fyc/*.jpg
 * came to hold PNG data: this library is served through a WebP plugin and
 * Photon transcodes on its own, so a `.jpg` URL answers with PNG or WebP as it
 * pleases. Vercel then set `Content-Type: image/jpeg` on PNG bytes — a mismatch
 * browsers happen to sniff past, and nothing downstream should have to.
 */
function extensionOf(buf) {
  const starts = (...bytes) => bytes.every((b, i) => buf[i] === b);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "png";
  if (starts(0xff, 0xd8, 0xff)) return "jpg";
  if (starts(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((b, i) => buf[8 + i] === b)) {
    return "webp";
  }
  return "";
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  // Start from an empty directory: the extension follows the delivered bytes,
  // so a re-run can rename a sheet, and a stale file under the old name would
  // still be served while nothing in the manifest pointed at it.
  await rm(OUT_DIR, { recursive: true, force: true });
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
      const stem = `lyric-${pageId}-${String(i + 1).padStart(2, "0")}`;
      if (!src) {
        failures.push(`page ${pageId} sheet ${i + 1}: gallery item has no url`);
        continue;
      }
      try {
        const res = await fetch(photonSheet(src), { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < MIN_BYTES) throw new Error(`only ${buf.length} bytes`);
        const ext = extensionOf(buf);
        if (!ext) throw new Error("not a PNG/JPEG/WebP (magic bytes)");
        const name = `${stem}.${ext}`;
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
