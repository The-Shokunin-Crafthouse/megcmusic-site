import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBooking } from "./booking-content";

const acf = {
  page_lede: "Tell Meghan about your show.",
  intro: "Every show is booked personally.",
  include_items: [{ item: "The date and the city" }, { item: "  " }, { item: "Solo or full band" }],
  fact_formats: "Solo Acoustic · Duo · Full Band",
  fact_based: "Front Range, Colorado",
  fact_plays: "",
  meta_title: "Booking — MegCMusic",
  meta_description: "Book Meghan.",
};

test("every field lands in its slot; empty checklist rows and empty facts drop", () => {
  assert.deepEqual(parseBooking(acf), {
    lede: "Tell Meghan about your show.",
    intro: "Every show is booked personally.",
    includeItems: ["The date and the city", "Solo or full band"],
    facts: [
      { label: "Formats", value: "Solo Acoustic · Duo · Full Band" },
      { label: "Based", value: "Front Range, Colorado" },
    ],
    metaTitle: "Booking — MegCMusic",
    metaDescription: "Book Meghan.",
  });
});

test("facts keep the page's fixed order — Formats, Based, Plays — whatever the field order", () => {
  const out = parseBooking({ fact_plays: "Bars", fact_based: "Colorado", fact_formats: "Solo" });
  assert.deepEqual(out.facts.map((f) => f.label), ["Formats", "Based", "Plays"]);
});

test("ACF's false for an empty repeater is an empty list", () => {
  assert.deepEqual(parseBooking({ include_items: false }).includeItems, []);
  assert.deepEqual(parseBooking(undefined).facts, []);
});
