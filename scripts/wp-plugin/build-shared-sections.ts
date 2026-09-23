/**
 * Generate wp-plugin/megc-site-content/shared-sections.json (ADR 2026-09-23)
 * from each section's `source` in src/lib/page-layouts.ts and the plugin's
 * field groups. The plugin reads it to put an editor for shared fields on
 * every page that shows them and to save each back to the page that keeps it.
 *
 *   npm run layout:build    # writes this file and the Page layout groups
 *   npm run layout:check    # exit 1 if either differs from the registry
 *
 * Never hand-edited (learning #178). A registry field that no group on its
 * page carries fails here with the route, section and field named.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { PAGE_LAYOUTS } from "../../src/lib/page-layouts";
import { buildSharedSections, type AcfGroupJson } from "../../src/lib/shared-sections";

const PLUGIN_DIR = path.join(process.cwd(), "wp-plugin", "megc-site-content");
const ACF_DIR = path.join(PLUGIN_DIR, "acf-json");
const OUT = path.join(PLUGIN_DIR, "shared-sections.json");
const CHECK = process.argv.includes("--check");

const groups = readdirSync(ACF_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(ACF_DIR, f), "utf8")) as AcfGroupJson);

const config = buildSharedSections(PAGE_LAYOUTS, groups);
const json =
  JSON.stringify(
    {
      _generated: "From src/lib/page-layouts.ts by scripts/wp-plugin/build-shared-sections.ts — do not edit by hand.",
      ...config,
    },
    null,
    2,
  ) + "\n";

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(
      `layout:check — shared-sections.json ${current ? "differs from" : "is missing; would be produced by"} the registry — run \`npm run layout:build\` and commit.`,
    );
    process.exit(1);
  }
  console.log(`layout:check — shared-sections.json matches (${config.groups.length} shared sets, ${config.boxes.length} editor boxes, ${config.links.length} links)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote shared-sections.json (${config.groups.length} shared sets, ${config.boxes.length} editor boxes, ${config.links.length} links)`);
}
