/**
 * The Sprint 16 parity oracle: on the committed WordPress snapshots, each new
 * reader must produce exactly the strings the repo held before (the 2026-09-05
 * migration wrote those strings into the fields; scripts/wp-migrate/
 * hardcoded-strings.json is its record). The only permitted differences are
 * rows Meg has edited since, named here one by one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import migrated from "../../scripts/wp-migrate/hardcoded-strings.json";
import { BOOKING_CONTENT } from "./booking-content";
import { SHOWS_PAGE, SHOP_PAGE } from "./page-basics";
import { LIVE_FORMATS } from "./formats-content";
import { COLLAB } from "./collab-content";
import { getReviews, getPressPages, liveHref, MUSIC_INTRO } from "./releases-content";
import { getEpkContent } from "./epk-content";

test("booking: every field equals the string it replaced", () => {
  assert.equal(BOOKING_CONTENT.metaTitle, migrated.booking.meta.title);
  assert.equal(BOOKING_CONTENT.metaDescription, migrated.booking.meta.description);
  assert.equal(BOOKING_CONTENT.lede, migrated.booking.page_lede);
  assert.equal(BOOKING_CONTENT.intro, migrated.booking.intro);
  assert.deepEqual(BOOKING_CONTENT.includeItems, migrated.booking.include_items);
  assert.deepEqual(BOOKING_CONTENT.facts, [
    { label: "Formats", value: migrated.booking.facts.formats },
    { label: "Based", value: migrated.booking.facts.based },
    { label: "Plays", value: migrated.booking.facts.plays },
  ]);
});

test("shows and shop: lede and metadata equal the strings they replaced", () => {
  assert.deepEqual(SHOWS_PAGE, { lede: migrated.shows.page_lede, metaTitle: migrated.shows.meta.title, metaDescription: migrated.shows.meta.description });
  assert.deepEqual(SHOP_PAGE, { lede: migrated.shop.page_lede, metaTitle: migrated.shop.meta.title, metaDescription: migrated.shop.meta.description });
});

test("live formats equal the deleted src/config/formats.ts", () => {
  assert.deepEqual(LIVE_FORMATS, [
    { slug: "solo-acoustic", label: "Solo Acoustic", blurb: "Just Meghan and a guitar — listening rooms, house concerts, and weddings." },
    { slug: "full-band", label: "Full Band", blurb: "Meghan and her band — festivals, bars, and big rooms across the Front Range." },
  ]);
});

test("work with me equals the deleted src/config/collaborate.ts", () => {
  assert.equal(COLLAB.caveCrewUrl, "https://www.facebook.com/groups/1636196277191028/");
  assert.deepEqual(
    COLLAB.groups.map((g) => ({ heading: g.heading, blurb: g.blurb, offerings: g.offerings.map((o) => o.title) })),
    [
      {
        heading: "For fans & community",
        blurb: "Come closer than the back row.",
        offerings: [
          "The Cave Crew — her Facebook group for friends and fans",
          "House concerts, weddings, and private events",
          "Postcards from the road — the mailing list",
        ],
      },
      {
        heading: "For business & brands",
        blurb: "Original music, made for the moment.",
        offerings: [
          "Custom songs and jingles for branding, ads, and events",
          "Concerts for corporate events, retreats, and client appreciation",
          "Brand partnerships across performances and social",
        ],
      },
    ],
  );
  assert.ok(COLLAB.groups.every((g) => g.offerings.every((o) => o.detail === "")), "no offering carries a detail yet");
});

test("release reviews equal the deleted src/config/reviews.ts, plus the one row Meg added (4350, row 3); links to her own review pages now point at the absorbed route (2026-09-17)", () => {
  assert.deepEqual(getReviews("shadows-of-a-ghost-town"), [
    { source: "The Alternate Root", accolade: "Top 10 — October 2025", href: "/music/shadows-of-a-ghost-town/reviews" },
    { source: "Acoustic Music Seen", accolade: "#41 · Top 50 Albums of September 2025", href: "/music/shadows-of-a-ghost-town/reviews" },
    // Meg's addition, never rendered until this sprint.
    { source: "", accolade: "Nominated for Album of the Year by the Josie Music Awards and the Mountain West Country Music Association!" },
  ]);
  assert.deepEqual(getReviews("kindred-spirits"), [
    { source: "Joshua D’Estrada · K4CO Radio", quote: "Strikingly bright and vivid — a true example of beautiful country music.", href: "/music/kindred-spirits/reviews" },
  ]);
  // The absorbed pages themselves: every outlet link on the Shadows page, the K4CO quote on Kindred.
  const shadows = getPressPages("shadows-of-a-ghost-town");
  assert.equal(shadows.length, 1);
  assert.equal(shadows[0].title, "Reviews:  Shadows of a Ghost Town");
  const hrefs = shadows[0].blocks.flatMap((b) => (b.type === "paragraph" ? b.runs.map((r) => r.href).filter(Boolean) : []));
  assert.equal(hrefs.length, 8);
  const kindred = getPressPages("kindred-spirits");
  assert.equal(kindred.length, 1);
  assert.ok(kindred[0].blocks.some((b) => b.type === "quote" && b.attribution.includes("D’Estrada")), "the K4CO quote with its cite");
  assert.ok(kindred[0].blocks.some((b) => b.type === "image"), "the review image");
  assert.deepEqual(getReviews("songs-from-the-sofa"), []);
  assert.deepEqual(getReviews("breaker-breaker"), []);
  assert.deepEqual(getReviews("aint-going-back"), []);
});

test("the Music page body yields no intro today — production is unchanged by reading it at build", () => {
  assert.deepEqual(MUSIC_INTRO, []);
});

test("a link to an absorbed review page reads as its live route everywhere Meg's fields carry one (2026-09-17)", async () => {
  assert.equal(liveHref("https://admin.megcmusic.com/reviews-shadows-of-a-ghost-town/"), "/music/shadows-of-a-ghost-town/reviews");
  assert.equal(liveHref("https://www.megcmusic.com/kindred-spirits-review/"), "/music/kindred-spirits/reviews");
  assert.equal(liveHref("https://americanahighways.org/x"), "https://americanahighways.org/x");
  assert.equal(liveHref("https://admin.megcmusic.com/photos/"), "https://admin.megcmusic.com/photos/");
  const epk = await getEpkContent();
  assert.ok(epk.pressItems.every((p) => !/admin\.megcmusic\.com\/(reviews|kindred)/.test(p.href)), "EPK press coverage never links the old theme");
});
