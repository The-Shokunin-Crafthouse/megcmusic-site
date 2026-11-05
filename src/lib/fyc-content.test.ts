import { test } from "node:test";
import assert from "node:assert/strict";
import { lyricSheetsFrom, moreLinks } from "./fyc-content";

test("no More links saved → the three the page always had, The album pointing at the album page", () => {
  assert.deepEqual(moreLinks(false, "/music/shadows-of-a-ghost-town"), [
    { label: "The album", href: "/music/shadows-of-a-ghost-town" },
    { label: "Press kit", href: "/epk" },
    { label: "Contact", href: "/booking" },
  ]);
});

test("Meg's rows replace the defaults; megcmusic.com addresses go relative, other sites stay whole, half rows drop", () => {
  assert.deepEqual(
    moreLinks(
      [
        { label: "Press kit", url: "https://megcmusic.com/epk" },
        { label: "Admin host too", url: "https://admin.megcmusic.com/shop/" },
        { label: "Bandcamp", url: "https://meghanclarisse.bandcamp.com/album/x" },
        { label: "", url: "https://example.com" },
        { label: "No address", url: "" },
      ],
      "/music",
    ),
    [
      { label: "Press kit", href: "/epk" },
      { label: "Admin host too", href: "/shop/" },
      { label: "Bandcamp", href: "https://meghanclarisse.bandcamp.com/album/x" },
    ],
  );
});

test("a null manifest entry means the campaign page is unpublished", () => {
  assert.equal(lyricSheetsFrom({ "4350": null }, 4350), null);
});

test("a published campaign returns its sheets, and an empty gallery stays an empty list", () => {
  const sheet = { src: "/images/fyc/a.jpg", alt: "", width: 1, height: 1 };
  assert.deepEqual(lyricSheetsFrom({ "4566": [sheet] }, 4566), [sheet]);
  assert.deepEqual(lyricSheetsFrom({ "4566": [] }, 4566), []);
});

test("a missing manifest entry stays a build failure", () => {
  assert.throws(() => lyricSheetsFrom({}, 4350), /no entry for WP page 4350/);
});
