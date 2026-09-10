// Phase 3 test rows: a watch URL with a caption, a Shorts URL without one, and
// an invalid link (must be dropped). Never written to live page 4.
import fs from "node:fs";
const f = process.argv[2];
const d = JSON.parse(fs.readFileSync(f, "utf8"));
d.home_blocks = [
  { acf_fc_layout: "video", youtube_url: "https://www.youtube.com/watch?v=A8E_XRwkhTk", caption: "Copper & Quartz, live at Society Hall — the full set." },
  { acf_fc_layout: "video", youtube_url: "https://youtube.com/shorts/9L1cSL9u-U0?si=VApLsMHlPxgdXdZk", caption: "" },
  { acf_fc_layout: "video", youtube_url: "https://vimeo.com/123456", caption: "Must be dropped" },
];
fs.writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
console.log("injected", d.home_blocks.length, "rows into", f);
