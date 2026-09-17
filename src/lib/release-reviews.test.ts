import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReviews } from "./release-reviews";

test("kind, when Meg sets it, decides quote versus accolade", () => {
  assert.deepEqual(
    parseReviews([
      { kind: "quote", quote_or_accolade: "Top 10", source: "Someone", link: "" },
      { kind: "accolade", quote_or_accolade: "A long sentence of praise that reads like a review line.", source: "Outlet", link: "https://x" },
    ]),
    [
      { source: "Someone", quote: "Top 10" },
      { source: "Outlet", accolade: "A long sentence of praise that reads like a review line.", href: "https://x" },
    ],
  );
});

test("without kind: a sourced sentence of six-plus words is a quote; placements and unsourced lines are accolades", () => {
  assert.deepEqual(
    parseReviews([
      { quote_or_accolade: "Strikingly bright and vivid — a true example of beautiful country music.", source: "K4CO Radio", link: "https://r" },
      { quote_or_accolade: "Top 10 — October 2025", source: "The Alternate Root", link: "" },
      { quote_or_accolade: "#41 · Top 50 Albums of September 2025", source: "Acoustic Music Seen", link: "" },
      { quote_or_accolade: "2025 Album of the Year shortlist, Mountain West Country Music Association", source: "MWCMA", link: "" },
      { quote_or_accolade: "Nominated for Album of the Year by the Josie Music Awards and the Mountain West Country Music Association!", source: "", link: "" },
    ]),
    [
      { source: "K4CO Radio", quote: "Strikingly bright and vivid — a true example of beautiful country music.", href: "https://r" },
      { source: "The Alternate Root", accolade: "Top 10 — October 2025" },
      { source: "Acoustic Music Seen", accolade: "#41 · Top 50 Albums of September 2025" },
      { source: "MWCMA", accolade: "2025 Album of the Year shortlist, Mountain West Country Music Association" },
      { source: "", accolade: "Nominated for Album of the Year by the Josie Music Awards and the Mountain West Country Music Association!" },
    ],
  );
});

test("the shape rule's boundary: five sourced words is an accolade, six is a quote", () => {
  assert.deepEqual(parseReviews([{ quote_or_accolade: "One two three four five", source: "S" }]), [{ source: "S", accolade: "One two three four five" }]);
  assert.deepEqual(parseReviews([{ quote_or_accolade: "One two three four five six", source: "S" }]), [{ source: "S", quote: "One two three four five six" }]);
});

test("an empty row (the one ACF leaves behind) and a non-list are nothing", () => {
  assert.deepEqual(parseReviews([{ quote_or_accolade: "", source: "", link: "" }, { quote_or_accolade: "  " }]), []);
  assert.deepEqual(parseReviews(false), []);
  assert.deepEqual(parseReviews(undefined), []);
});

test("a link is only carried when it is a URL", () => {
  assert.deepEqual(parseReviews([{ quote_or_accolade: "Top 5", source: "S", link: "not a url" }]), [{ source: "S", accolade: "Top 5" }]);
});
