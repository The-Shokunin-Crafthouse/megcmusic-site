// Phase 2 test rows for the after build's home.json snapshot: a long quote
// with attribution, a short one without, and an empty quote (must be dropped).
import fs from "node:fs";
const f = process.argv[2];
const d = JSON.parse(fs.readFileSync(f, "utf8"));
d.home_blocks = [
  { acf_fc_layout: "pull_quote", quote: "Cave writes like someone who has driven every mile of the road she sings about — the kind of record you keep in the truck for the long way home.", attribution: "Colorado Sound, album review" },
  { acf_fc_layout: "pull_quote", quote: "Country roots, cowgirl boots.", attribution: "" },
  { acf_fc_layout: "pull_quote", quote: "   ", attribution: "Nobody" },
];
fs.writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
console.log("injected", d.home_blocks.length, "rows into", f);
