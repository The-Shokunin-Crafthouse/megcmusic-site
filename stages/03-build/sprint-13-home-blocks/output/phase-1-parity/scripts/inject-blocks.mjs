// Inject test announcement rows into the "after" build's home.json snapshot.
// Three rows: a full announcement with an external link, a headline+body
// announcement with a same-site link, and an unknown layout (must be dropped
// and logged at build). Never written to live page 4.
import fs from "node:fs";
const f = process.argv[2];
const d = JSON.parse(fs.readFileSync(f, "utf8"));
d.home_blocks = [
  { acf_fc_layout: "announcement", eyebrow: "New single", headline: "Everything You Are To Me — out now", body: "The first single from the next record, written on the road between Denver and Durango. Streaming everywhere today.", link_label: "Listen on Spotify", link_url: "https://open.spotify.com/artist/3iUKOkvtyfkAcg8pOWU5wp" },
  { acf_fc_layout: "announcement", eyebrow: "", headline: "Booking for fall and winter shows is open", body: "House concerts, listening rooms, and private events across Colorado.", link_label: "See the press kit", link_url: "/epk" },
  { acf_fc_layout: "poster", headline: "This row must be dropped and logged" },
];
fs.writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
console.log("injected", d.home_blocks.length, "rows into", f);
