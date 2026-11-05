import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ONE_SHEET } from "./epk-one-sheet";

const inPublic = (url: string) => join(process.cwd(), "public", url);

test("one-sheet PDF and preview resolve to files in public/", () => {
  assert.match(ONE_SHEET.pdf, /^\/press\/.+\.pdf$/);
  assert.match(ONE_SHEET.preview, /^\/press\/.+\.(jpe?g|png|webp)$/);
  assert.ok(existsSync(inPublic(ONE_SHEET.pdf)), `missing ${ONE_SHEET.pdf}`);
  assert.ok(existsSync(inPublic(ONE_SHEET.preview)), `missing ${ONE_SHEET.preview}`);
});

test("download label states the real file size", () => {
  const bytes = readFileSync(inPublic(ONE_SHEET.pdf)).length;
  assert.equal(ONE_SHEET.sizeLabel, `${(bytes / 1_048_576).toFixed(1)} MB`);
});

test("PDF title is Meg's, not the Canva template name (it becomes the browser tab title)", () => {
  const pdf = readFileSync(inPublic(ONE_SHEET.pdf)).toString("latin1");
  assert.ok(!/Copy of Copy|Media Kit\)/.test(pdf), "PDF Title still carries the Canva template name");
  assert.match(pdf, /\/Title\s*\((?:\xfe\xff)?[^)]*M\x00?e\x00?g\x00?h\x00?a\x00?n/);
});
