import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePageBasics } from "./page-basics";

test("lede and metadata read straight through, trimmed", () => {
  assert.deepEqual(
    parsePageBasics({ page_lede: "  Every date on the calendar.  ", meta_title: "Shows — MegCMusic", meta_description: " The calendar. " }),
    { lede: "Every date on the calendar.", metaTitle: "Shows — MegCMusic", metaDescription: "The calendar." },
  );
});

test("a missing or non-string field is an empty string, never undefined", () => {
  assert.deepEqual(parsePageBasics({}), { lede: "", metaTitle: "", metaDescription: "" });
  assert.deepEqual(parsePageBasics({ page_lede: false, meta_title: 3 }), { lede: "", metaTitle: "", metaDescription: "" });
  assert.deepEqual(parsePageBasics(null), { lede: "", metaTitle: "", metaDescription: "" });
});
