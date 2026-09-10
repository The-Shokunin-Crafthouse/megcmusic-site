import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeVideoIds } from "./video-merge";

test("featured leads, then Meg's whole list in her order, then extras — the channel feed is not appended", () => {
  const out = mergeVideoIds({
    featured: "feat",
    curated: ["c1", "c2", "c3"],
    channel: ["n1", "n2"],
    extras: ["x1"],
  });
  assert.deepEqual(out, ["feat", "c1", "c2", "c3", "x1"]);
});

test("her whole list survives, however long, and nothing she did not pick joins it", () => {
  // The regression that started Sprint 12: nine curated videos, fifteen channel
  // uploads. All nine of hers, none of the channel's.
  const curated = Array.from({ length: 9 }, (_, i) => `meg${i}`);
  const channel = Array.from({ length: 15 }, (_, i) => `rss${i}`);
  const out = mergeVideoIds({ featured: "meg0", curated, channel, extras: [] });
  assert.deepEqual(out, curated);
});

test("the channel's newest uploads fill in only when she has curated nothing", () => {
  const out = mergeVideoIds({ featured: "f", curated: [], channel: ["n1", "n2"], extras: [] });
  assert.deepEqual(out, ["f", "n1", "n2"]);
});

test("dedupes: a featured video that is also in her list appears once, first", () => {
  const out = mergeVideoIds({ featured: "b", curated: ["a", "b", "c"], channel: [], extras: ["c"] });
  assert.deepEqual(out, ["b", "a", "c"]);
});

test("an empty featured id is skipped, not emitted", () => {
  const out = mergeVideoIds({ featured: "", curated: [], channel: ["a"], extras: [] });
  assert.deepEqual(out, ["a"]);
});
