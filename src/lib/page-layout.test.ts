import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLayout } from "./page-layout";

const quiet = () => {};
const SECTIONS = ["story", "kit", "press"];

test("an empty field is today's page: every section, in registry order, no blocks", () => {
  const expected = SECTIONS.map((id) => ({ kind: "section", id }));
  assert.deepEqual(resolveLayout(false, SECTIONS, quiet), expected);
  assert.deepEqual(resolveLayout(undefined, SECTIONS, quiet), expected);
  assert.deepEqual(resolveLayout([], SECTIONS, quiet), expected);
});

test("listed rows come first in Meg's order; unlisted sections follow in registry order", () => {
  const out = resolveLayout(
    [
      { acf_fc_layout: "section_press", hidden: false },
      { acf_fc_layout: "pull_quote", quote: "Q", attribution: "" },
    ],
    SECTIONS,
    quiet,
  );
  assert.deepEqual(out, [
    { kind: "section", id: "press" },
    { kind: "block", block: { layout: "pull_quote", quote: "Q", attribution: "" } },
    { kind: "section", id: "story" },
    { kind: "section", id: "kit" },
  ]);
});

test("a hidden section is gone; a duplicate or unknown section row is dropped and logged", () => {
  const logged: string[] = [];
  const out = resolveLayout(
    [
      { acf_fc_layout: "section_kit", hidden: true },
      { acf_fc_layout: "section_story", hidden: false },
      { acf_fc_layout: "section_story", hidden: true },
      { acf_fc_layout: "section_carousel" },
    ],
    SECTIONS,
    (m) => logged.push(m),
  );
  assert.deepEqual(out, [{ kind: "section", id: "story" }, { kind: "section", id: "press" }]);
  assert.equal(logged.length, 2);
  assert.match(logged[0], /row 3/);
  assert.match(logged[1], /carousel/);
});

test("an invalid block row (no headline) is dropped without disturbing the sections around it", () => {
  const out = resolveLayout(
    [{ acf_fc_layout: "section_kit" }, { acf_fc_layout: "announcement", headline: "" }, { acf_fc_layout: "section_story" }],
    SECTIONS,
    quiet,
  );
  assert.deepEqual(out, [{ kind: "section", id: "kit" }, { kind: "section", id: "story" }, { kind: "section", id: "press" }]);
});

test("ACF's true_false arrives as boolean, 1/0 or '1'/'' — all read as hidden", () => {
  for (const hidden of [true, 1, "1"]) {
    assert.deepEqual(resolveLayout([{ acf_fc_layout: "section_kit", hidden }], SECTIONS, quiet).map((i) => (i.kind === "section" ? i.id : "")), ["story", "press"]);
  }
  for (const hidden of [false, 0, "", undefined]) {
    assert.equal(resolveLayout([{ acf_fc_layout: "section_kit", hidden }], SECTIONS, quiet).length, 3);
  }
});
