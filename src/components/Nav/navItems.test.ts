import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_ITEMS } from "./navItems";

test("EPK is in the site nav, between Poetry and Booking", () => {
  const labels = NAV_ITEMS.map((i) => i.label);
  const epk = NAV_ITEMS.find((i) => i.label === "EPK");
  assert.deepEqual(epk, { label: "EPK", href: "/epk" });
  assert.equal(labels.indexOf("EPK"), labels.indexOf("Poetry") + 1);
  assert.equal(labels.indexOf("Booking"), labels.indexOf("EPK") + 1);
});

test("nav stays at nine items — the 768–1023 tablet band in Nav.module.css is sized for nine", () => {
  assert.equal(NAV_ITEMS.length, 9);
});
