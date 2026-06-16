/**
 * Standalone API reachability check — proves the three headless
 * data sources respond and return data, independent of the
 * Next.js render pipeline.
 *
 *   npm run verify:apis
 *   # → node --env-file=.env.local --import tsx scripts/verify-apis.ts
 */
import { getPages } from "../src/lib/api/wordpress";
import { getProducts } from "../src/lib/api/woocommerce";
import { getEvents } from "../src/lib/api/events";

async function main(): Promise<void> {
  const checks: Array<[string, number]> = [
    ["WordPress pages", (await getPages()).length],
    ["WooCommerce products", (await getProducts()).length],
    ["Upcoming shows", (await getEvents("upcoming")).length],
  ];

  for (const [label, count] of checks) {
    console.log(`✓ ${label}: ${count}`);
  }
}

main().catch((err) => {
  console.error("✗ API verification failed:", err);
  process.exit(1);
});
