#!/usr/bin/env node
// Calls the plugin's push-install route on the live WordPress from the
// release workflow: POST /wp-json/megc/v1/self-update with the
// megc-automation application password. The request is shaped exactly
// like scripts/wp-ops/wp-ops.mjs's — Node's fetch, a JSON body with its
// Content-Type — because a bodiless `curl -X POST` from the runner was
// answered 406 by Bluehost's Mod_Security before WordPress saw it (OWASP
// CRS 920180, "POST without Content-Length"; run 35918681302, 2026-09-23).
//
// Never throws on a non-2xx: writes the status and the raw body to the
// path in $OUT (default body.json) and exits 0, so an auth failure, a
// bot checkpoint and a wrong-shaped 200 stay distinguishable (learning
// #46) and scripts/ci/wp-plugin-release.sh `installed` reads the reply.
// Only a transport failure exits non-zero, after one retry — the route is
// idempotent (already current → ok, nothing to do).
import { writeFileSync } from "node:fs";

const ORIGIN = process.env.WP_ORIGIN || "https://admin.megcmusic.com";
const USER = process.env.WP_APP_USER;
const PASS = process.env.WP_APP_PASSWORD;
const OUT = process.env.OUT || "body.json";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 240_000);
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 20_000);

if (!USER || !PASS) {
  console.error("::error::WP_APP_USER / WP_APP_PASSWORD are not set; the release is published but nothing was installed");
  process.exit(1);
}

const url = `${ORIGIN}/wp-json/megc/v1/self-update`;
const init = {
  method: "POST",
  headers: {
    Authorization: "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64"),
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
};

let last;
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text();
    console.log(`HTTP ${res.status}`);
    console.log(text.slice(0, 2000));
    writeFileSync(OUT, text);
    process.exit(0);
  } catch (e) {
    last = e;
    console.error(`attempt ${attempt}: ${e?.cause?.code || e?.name || e}`);
    if (attempt < 2) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}
console.error(`::error::could not reach ${url}: ${last?.message || last}`);
process.exit(1);
