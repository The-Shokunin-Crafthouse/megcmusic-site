/**
 * Build-time resolve + download of each page's background photo
 * (Sprint 11 — per-page editable hero).
 *
 * For every page that renders the big background image, the photo resolves:
 *
 *   1. that page's own ACF `page_photo`, if Meg set one;
 *   2. otherwise the site-wide `hero_photo` on the Home page;
 *   3. otherwise the committed fallback, public/images/hero/meghan-hero.jpg.
 *
 * The chosen image is downloaded into public/images/page-hero/ (a gitignored
 * build artifact) and src/generated/page-hero.json maps each page key to its
 * public path. src/lib/hero-images.ts imports that manifest, which is committed
 * for the same reason as the wp-content snapshots: it is a statically-imported
 * build input, so `next dev` and `tsc` need it present.
 *
 * Two things this deliberately gets right:
 *
 * - **Originals, not renditions.** `source_url` is WordPress's `-scaled`
 *   derivative (2560px wide); Jetpack Photon shrinks named renditions further.
 *   We fetch `original_image` from the same upload directory, which for today's
 *   hero is byte-identical to the committed file — so nothing changes visually
 *   until Meg actually swaps a photo. Same lesson as the FYC lyric sheets.
 * - **Deduplicated.** Pages sharing one photo (all of them, today) share one
 *   downloaded file, keyed by content hash — not fifteen copies of the same
 *   half-megabyte JPEG.
 *
 * Fails loudly: a page that cannot be read, or an image that downloads short or
 * without a valid image signature, exits non-zero with a named cause. Nothing
 * deploys and the previous production deploy stays live.
 */

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

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
const API = `${ORIGIN}/wp-json/wp/v2`;
const OUT_DIR = path.join(process.cwd(), "public", "images", "page-hero");
const MANIFEST = path.join(process.cwd(), "src", "generated", "page-hero.json");
const FALLBACK = path.join(process.cwd(), "public", "images", "hero", "meghan-hero.jpg");
const FALLBACK_PUBLIC = "/images/hero/meghan-hero.jpg";
const TIMEOUT_MS = 20_000;
const MIN_BYTES = 10_000;

/**
 * Page key → the WP page Meg edits, as an id or a `{ slug }`.
 * Release keys mirror `wpSlug` in src/config/releases.ts; a rename there
 * surfaces here as a loud build failure rather than a silently stale photo.
 */
const HERO_PAGES = {
  home: 4,
  booking: 5,
  media: 10,
  shows: 20,
  epk: 608,
  shop: 1847,
  music: 5562,
  poetry: { slug: "site-poetry" },
  "fyc-shadows-of-a-ghost-town": 4350,
  "fyc-kindred-spirits": 4566,
  "release-shadows-of-a-ghost-town": 4350,
  "release-kindred-spirits": 4378,
  "release-songs-from-the-sofa-2": 4395,
  "release-breaker-breaker": 4403,
  "release-aint-going-back": 4411,
};

const fail = (message) => {
  console.error(
    `hero-images build failed: ${message}. Nothing is deployed; the previous ` +
      `production deploy stays live. Check ${ORIGIN}/wp-admin and re-run the build.`,
  );
  process.exit(1);
};

async function getJson(url, what) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} reading ${what}`);
  return res.json();
}

async function resolvePageId(target) {
  if (typeof target === "number") return target;
  const rows = await getJson(
    `${API}/pages?slug=${encodeURIComponent(target.slug)}&_fields=id`,
    `slug "${target.slug}"`,
  );
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`no published page with slug "${target.slug}"`);
  }
  return rows[0].id;
}

/** ACF image fields return `false` when empty and an object when set. */
const imageOf = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

/**
 * The full-size upload behind an ACF image, never a rendition and never Photon.
 *
 * ACF's image array carries only a `url`, and on this install that URL is a
 * Jetpack Photon link to the `-scaled` derivative — fetching it returns a
 * re-encoded 2560px image, not the file that was uploaded. So resolve through
 * the media endpoint instead: `media_details.file` gives the upload path and
 * `original_image` the untouched filename, and we rebuild the URL on the WP
 * origin so Photon never sees the request.
 */
async function originalUrl(image) {
  const id = image.ID ?? image.id;
  if (!id) throw new Error("image field carries no attachment id");
  const media = await getJson(
    `${API}/media/${id}?_fields=source_url,media_details`,
    `attachment ${id}`,
  );
  const file = media?.media_details?.file; // e.g. "2026/09/meghan-hero-scaled.jpg"
  const original = media?.media_details?.original_image; // e.g. "meghan-hero.jpg"
  if (file && original) {
    const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";
    return `${ORIGIN}/wp-content/uploads/${dir ? `${dir}/` : ""}${original}`;
  }
  if (file) return `${ORIGIN}/wp-content/uploads/${file}`;
  const source = typeof media?.source_url === "string" ? media.source_url : "";
  if (!source) throw new Error(`attachment ${id} has no resolvable file`);
  return source;
}

async function download(url, what) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} downloading ${what}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < MIN_BYTES) {
    throw new Error(`${what} downloaded only ${bytes.length} bytes — too small to be the photo`);
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error(`${what} is not a JPEG, PNG or WebP — refusing to ship it`);
  }
  return { bytes, ext: isPng ? "png" : isWebp ? "webp" : "jpg" };
}

// --- resolve every page ------------------------------------------------
let siteDefault = null; // the Home page's site-wide hero_photo
const chosen = {}; // page key → image url, or null for the committed fallback

for (const [key, target] of Object.entries(HERO_PAGES)) {
  let pageId = typeof target === "number" ? target : `slug "${target.slug}"`;
  try {
    pageId = await resolvePageId(target);
    const json = await getJson(
      `${API}/pages/${pageId}?acf_format=standard&_fields=acf`,
      `page ${pageId}`,
    );
    const acf = json?.acf ?? {};
    if (key === "home") {
      const site = imageOf(acf.hero_photo);
      siteDefault = site ? await originalUrl(site) : null;
    }
    const own = imageOf(acf.page_photo);
    chosen[key] = own ? await originalUrl(own) : null;
  } catch (e) {
    fail(`could not read the photo field for the ${key} page (WP page ${pageId}) — ${e.message}`);
  }
}

// A page with no photo of its own falls back to the site-wide photo, then to
// the committed file.
for (const key of Object.keys(chosen)) {
  chosen[key] ??= siteDefault;
}

// --- download, deduplicated by content ---------------------------------
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const byUrl = new Map(); // url → public path
const byHash = new Map(); // content hash → public path
const fallbackHash = createHash("sha256").update(readFileSync(FALLBACK)).digest("hex");
byHash.set(fallbackHash, FALLBACK_PUBLIC);

const manifest = {};
for (const [key, url] of Object.entries(chosen)) {
  if (!url) {
    manifest[key] = FALLBACK_PUBLIC;
    continue;
  }
  if (byUrl.has(url)) {
    manifest[key] = byUrl.get(url);
    continue;
  }
  if (/(^|\.)i\d?\.wp\.com/.test(new URL(url).hostname)) {
    fail(
      `the ${key} page photo resolved to a Jetpack Photon URL (${url}) — that ` +
        `serves a re-encoded derivative, not the uploaded file`,
    );
  }
  let file;
  try {
    file = await download(url, `the ${key} page photo`);
  } catch (e) {
    fail(`could not download the ${key} page photo — ${e.message}`);
  }
  const hash = createHash("sha256").update(file.bytes).digest("hex");
  let publicPath = byHash.get(hash);
  if (!publicPath) {
    // Identical to the committed fallback → keep serving that one file.
    publicPath = `/images/page-hero/${hash.slice(0, 16)}.${file.ext}`;
    writeFileSync(path.join(OUT_DIR, path.basename(publicPath)), file.bytes);
    byHash.set(hash, publicPath);
  }
  byUrl.set(url, publicPath);
  manifest[key] = publicPath;
}

mkdirSync(path.dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
const distinct = new Set(Object.values(manifest)).size;
console.log(
  `wrote src/generated/page-hero.json — ${Object.keys(manifest).length} pages, ${distinct} distinct photo(s)`,
);
