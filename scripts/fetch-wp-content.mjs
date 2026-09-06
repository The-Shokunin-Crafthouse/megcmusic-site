/**
 * Build-time fetch of the ACF content Meg edits in WordPress, written to
 * src/generated/wp-content/<surface>.json (Sprint 11 Phase 3).
 *
 * Why a prebuild step rather than a fetch inside the page: the surfaces this
 * feeds are DYNAMIC routes (src/lib/api/wordpress.ts fetches with
 * revalidate: 0), and the Vercel serverless runtime cannot reach
 * admin.megcmusic.com — verified 2026-09-06, production /epk server-renders no
 * set list and /media no photos, both of which WordPress serves fine to the
 * GitHub Actions runner. A per-request ACF read would therefore throw on every
 * visit. Fetching here instead means the read happens once, on the runner, and
 * the snapshot is bundled: Meg's saved edit still reaches the site in one
 * rebuild (deploy.yml's wp-content-updated dispatch).
 *
 * Fails loudly: any surface that cannot be read exits non-zero with a named
 * cause, nothing deploys, and the previous production deploy stays live.
 *
 * The written files are COMMITTED so `next dev` and `tsc` work without a build.
 * They are generated — never hand-edit them; run this script instead:
 *
 *   node scripts/fetch-wp-content.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// `??` is not enough: the Vercel env delivers NEXT_PUBLIC_WP_ORIGIN set-but-empty,
// which `??` passes through, and fetch then throws "Failed to parse URL" before
// any network I/O. Same guard as src/lib/wp-origin.ts, same incident.
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
const OUT_DIR = path.join(process.cwd(), "src", "generated", "wp-content");
const TIMEOUT_MS = 15_000;

/** Surface key → the WP page Meg edits, as a page id or a `{ slug }` to resolve.
 *  A Phase-3 PR adds its surface here. */
const SURFACES = {
  epk: 608, // "Press Kit"
  media: 10, // "Media" — the page's own copy
  videos: 5560, // "Videos" — the featured video + list, shown on Home and Media
  // Created by the Phase-2 migration rather than pre-existing, and the plugin
  // locates its field group by slug — so resolve it the same way.
  poetry: { slug: "site-poetry" }, // "Site: Poetry"
};

/** Resolve a `{ slug }` surface to its page id. */
async function resolvePageId(target) {
  if (typeof target === "number") return target;
  const url = `${API}/pages?slug=${encodeURIComponent(target.slug)}&_fields=id`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} resolving slug "${target.slug}"`);
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`no published page with slug "${target.slug}"`);
  }
  return rows[0].id;
}

async function readAcf(pageId) {
  const url = `${API}/pages/${pageId}?acf_format=standard&_fields=acf`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!json.acf || typeof json.acf !== "object" || Array.isArray(json.acf)) {
        throw new Error("response carries no acf object — is the megc-site-content plugin active?");
      }
      if (!Object.keys(json.acf).length) {
        throw new Error("acf object is empty — the field group is not attached to this page");
      }
      return json.acf;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(String(lastError));
}

/** ACF echoes a `<field>_source` sibling for every field; it is editor
 *  metadata (label, type, formatted_value), not content. */
const stripSourceKeys = (acf) =>
  Object.fromEntries(Object.entries(acf).filter(([k]) => !k.endsWith("_source")));

mkdirSync(OUT_DIR, { recursive: true });

for (const [surface, target] of Object.entries(SURFACES)) {
  let acf;
  let pageId = typeof target === "number" ? target : `slug "${target.slug}"`;
  try {
    pageId = await resolvePageId(target);
    acf = await readAcf(pageId);
  } catch (e) {
    console.error(
      `wp-content build failed: could not read ACF fields for the ${surface} surface ` +
        `(WP page ${pageId}) — ${e.message}. Nothing is deployed; the previous ` +
        `production deploy stays live. Check ${ORIGIN}/wp-admin and re-run the build.`,
    );
    process.exit(1);
  }
  const content = stripSourceKeys(acf);
  const file = path.join(OUT_DIR, `${surface}.json`);
  writeFileSync(file, JSON.stringify(content, null, 2) + "\n");
  console.log(`wrote src/generated/wp-content/${surface}.json (${Object.keys(content).length} fields)`);
}
