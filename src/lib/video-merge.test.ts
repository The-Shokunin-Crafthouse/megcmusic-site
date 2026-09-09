import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeVideoIds } from "./video-merge";

test("featured leads, then Meg's list in her order, then channel uploads, then extras", () => {
  const out = mergeVideoIds({
    featured: "feat",
    curated: ["c1", "c2", "c3"],
    channel: ["n1", "n2"],
    extras: ["x1"],
  });
  assert.deepEqual(out, ["feat", "c1", "c2", "c3", "n1", "n2", "x1"]);
});

test("her list outranks the channel's newest uploads even when the channel has more", () => {
  // The regression that started Sprint 12: nine curated videos, fifteen channel
  // uploads, a five-tile gallery. The first five must be hers.
  const curated = Array.from({ length: 9 }, (_, i) => `meg${i}`);
  const channel = Array.from({ length: 15 }, (_, i) => `rss${i}`);
  const out = mergeVideoIds({ featured: "meg0", curated, channel, extras: [] });
  assert.deepEqual(out.slice(0, 5), ["meg0", "meg1", "meg2", "meg3", "meg4"]);
});

test("dedupes: a curated video that is also a channel upload appears once, in her slot", () => {
  const out = mergeVideoIds({
    featured: "",
    curated: ["b"],
    channel: ["a", "b", "c"],
    extras: ["c"],
  });
  assert.deepEqual(out, ["b", "a", "c"]);
});

test("an empty featured id is skipped, not emitted", () => {
  const out = mergeVideoIds({ featured: "", curated: [], channel: ["a"], extras: [] });
  assert.deepEqual(out, ["a"]);
});

test("with no curated list the channel's newest upload leads after the featured tile", () => {
  const out = mergeVideoIds({ featured: "f", curated: [], channel: ["n1", "n2"], extras: [] });
  assert.deepEqual(out, ["f", "n1", "n2"]);
});
