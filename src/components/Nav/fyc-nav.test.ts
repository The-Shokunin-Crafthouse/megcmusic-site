import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_ITEMS } from "./navItems";

test("the live nav has no FYC entry while the campaign page is a draft", () => {
  assert.equal(NAV_ITEMS.some((i) => i.label === "FYC" || i.href.startsWith("/fyc")), false);
});
