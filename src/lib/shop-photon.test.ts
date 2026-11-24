import { test } from "node:test";
import assert from "node:assert/strict";
import { photonWidth } from "./shop";

// Photon serves a PNG source at full weight unless `quality` is set: /shop's
// LCP waited on ~3.6 MB of PNG tiles (Sprint 14 Phase 2.1).
test("photonWidth asks for a width and a quality, and replaces any sizing already there", () => {
  const out = new URL(
    photonWidth("https://i0.wp.com/admin.megcmusic.com/wp-content/uploads/a.png?fit=1400%2C1400&w=300&ssl=1", 600),
  );
  assert.equal(out.searchParams.get("w"), "600");
  assert.equal(out.searchParams.get("quality"), "82");
  assert.equal(out.searchParams.get("fit"), null);
});

test("photonWidth leaves a non-Photon URL alone", () => {
  const src = "https://admin.megcmusic.com/wp-content/uploads/a.png";
  assert.equal(photonWidth(src, 600), src);
});
