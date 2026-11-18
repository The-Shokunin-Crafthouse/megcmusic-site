/**
 * Build-time read of every published product into
 * src/generated/wp-content/products.json (the public Store API's own shape), so
 * /shop and every /shop/[slug] ship their products in the HTML.
 *
 * Why a prebuild step: the deploy holds no wc/v3 keys, and the Vercel runtime
 * cannot reach admin.megcmusic.com (decisions.md, 2026-09-06), so the pages'
 * own read came back empty and every visitor waited on hydration plus a
 * cross-origin fetch before the first product image (Sprint 14 Phase 2.1:
 * /shop LCP 13.3 s on throttled mobile). The runner can reach WordPress, so
 * the read happens here once.
 *
 * Fails SOFT, like fetch-events.mjs: an unreadable store logs a workflow
 * warning and leaves the committed snapshot in place. The written file is
 * COMMITTED so `next dev` and `tsc` work without a build. It is generated;
 * never hand-edit it. Run: node scripts/fetch-products.mjs
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
const OUT = path.join(process.cwd(), "src", "generated", "wp-content", "products.json");
const ATTEMPTS = 3;

async function read() {
  let last;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(`${ORIGIN}/wp-json/wc/store/v1/products?per_page=100`, {
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const list = await res.json();
      if (!Array.isArray(list) || !list.length) throw new Error("the catalogue came back empty");
      return list;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

try {
  const products = await read();
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(products) + "\n");
  console.log(`wrote src/generated/wp-content/products.json (${products.length} products)`);
} catch (e) {
  console.log(
    `::warning title=Products not refreshed::${ORIGIN} products could not be read ` +
      `(${e.message}). Deploying the committed snapshot; browsers still fill the grid if it is empty.`,
  );
}
