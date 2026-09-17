import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormat } from "./formats-content";

test("a format card is its WP page slug plus the two fields", () => {
  assert.deepEqual(
    parseFormat({ format_label: " Solo Acoustic ", format_blurb: "Just Meghan and a guitar." }, "solo-acoustic"),
    { slug: "solo-acoustic", label: "Solo Acoustic", blurb: "Just Meghan and a guitar." },
  );
});

test("a card with no label is dropped, not rendered as an empty caption", () => {
  assert.equal(parseFormat({ format_label: "", format_blurb: "x" }, "full-band"), null);
  assert.equal(parseFormat(false, "full-band"), null);
});

test("a missing blurb is an empty string", () => {
  assert.deepEqual(parseFormat({ format_label: "Full Band" }, "full-band"), { slug: "full-band", label: "Full Band", blurb: "" });
});
