/**
 * Build-time read of Meg's release registry (Sprint 11 Phase 3 — final surface).
 *
 * The master list lives in the `releases` repeater on WP page 5562 ("Music
 * Page & Releases"): one row per release with its title, year, kind, the WP
 * page its detail content comes from, its shop product, and any per-release
 * streaming links. That one list powers the Discography on Home / Music /
 * Press Kit, the Singles list on Music, and each release's own page.
 *
 * ACF stores the page and product as IDs; the site addresses them by slug (the
 * cover art resolves from a page's featured image or a product image in the
 * browser). So each id is resolved to its slug here, at build.
 *
 * What this deliberately does NOT take from WordPress: the ROUTE slug of a
 * release detail page. `/music/songs-from-the-sofa` is served from the WP page
 * `songs-from-the-sofa-2` — deriving the route from the page slug would change
 * a live URL, which the contract forbids. Routes stay in src/config/releases.ts.
 *
 * Fails loudly: an unreadable page, or a release row pointing at a page or
 * product that cannot be resolved, exits non-zero with a named cause.
 */

import { writeFileSync, mkdirSync } from "node:fs";
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
const OUT = path.join(process.cwd(), "src", "generated", "releases.json");
const MUSIC_PAGE = 5562;
const TIMEOUT_MS = 15_000;

const fail = (message) => {
  console.error(
    `releases build failed: ${message}. Nothing is deployed; the previous ` +
      `production deploy stays live. Check ${ORIGIN}/wp-admin and re-run the build.`,
  );
  process.exit(1);
};

async function getJson(url, what) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} reading ${what}`);
  return res.json();
}

const text = (v) => (typeof v === "string" ? v : "");
/** ACF post_object with return_format "id" gives a number, or false when unset. */
const refId = (v) => (typeof v === "number" && v > 0 ? v : null);

const slugCache = new Map();
async function slugOf(kind, id, what) {
  const key = `${kind}:${id}`;
  if (slugCache.has(key)) return slugCache.get(key);
  const row = await getJson(`${API}/${kind}/${id}?_fields=slug`, what);
  const slug = text(row?.slug);
  if (!slug) throw new Error(`${what} (id ${id}) has no slug`);
  slugCache.set(key, slug);
  return slug;
}

let acf;
try {
  const json = await getJson(
    `${API}/pages/${MUSIC_PAGE}?acf_format=standard&_fields=acf`,
    `the Music page (${MUSIC_PAGE})`,
  );
  acf = json?.acf;
  if (!acf || typeof acf !== "object") {
    throw new Error("response carries no acf object — is the megc-site-content plugin active?");
  }
} catch (e) {
  fail(`could not read the Music page — ${e.message}`);
}

const rawRows = Array.isArray(acf.releases) ? acf.releases : [];
if (!rawRows.length) {
  fail("the Music page's release list is empty — refusing to ship a site with no discography");
}

const releases = [];
for (const row of rawRows) {
  const title = text(row.title);
  if (!title) fail("a release row has no title");
  const pageId = refId(row.release_page);
  const productId = refId(row.product);
  let pageSlug = null;
  let productSlug = null;
  try {
    if (pageId) pageSlug = await slugOf("pages", pageId, `the page for "${title}"`);
    if (productId) productSlug = await slugOf("product", productId, `the shop item for "${title}"`);
  } catch (e) {
    fail(`could not resolve a reference on the "${title}" release row — ${e.message}`);
  }
  releases.push({
    title,
    year: text(row.year),
    kind: text(row.kind) || "SINGLE",
    pageSlug,
    productSlug,
    spotifyUrl: text(row.spotify_url),
    appleUrl: text(row.apple_url),
  });
}

const out = {
  pageLede: text(acf.page_lede),
  metaTitle: text(acf.meta_title),
  metaDescription: text(acf.meta_description),
  artist: {
    spotify: text(acf.artist_spotify),
    apple: text(acf.artist_apple),
    amazon: text(acf.artist_amazon),
  },
  releases,
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote src/generated/releases.json — ${releases.length} releases`);
