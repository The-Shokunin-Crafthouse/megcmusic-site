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

const ORIGIN = process.env.NEXT_PUBLIC_WP_ORIGIN ?? "https://admin.megcmusic.com";
const API = `${ORIGIN}/wp-json/wp/v2`;
const OUT_DIR = path.join(process.cwd(), "src", "generated", "wp-content");
const TIMEOUT_MS = 15_000;

/** Surface key → the WP page Meg edits. A Phase-3 PR adds its surface here. */
const SURFACES = {
  epk: 608, // "Press Kit"
};

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

for (const [surface, pageId] of Object.entries(SURFACES)) {
  let acf;
  try {
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
