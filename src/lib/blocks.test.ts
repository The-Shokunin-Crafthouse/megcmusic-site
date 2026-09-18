import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlocks } from "./blocks";

const quiet = () => {};

test("an empty zone is an empty list — ACF's false and a missing key alike", () => {
  assert.deepEqual(parseBlocks(false, quiet), []);
  assert.deepEqual(parseBlocks(undefined, quiet), []);
  assert.deepEqual(parseBlocks([], quiet), []);
});

test("each layout parses its fields, in Meg's order", () => {
  const out = parseBlocks(
    [
      { acf_fc_layout: "pull_quote", quote: " A voice as grounded as the Mountain West ", attribution: "Americana Highways" },
      { acf_fc_layout: "announcement", eyebrow: "New single", headline: "Everything You Are To Me", body: "Out now.", link_label: "Listen", link_url: "https://example.com/listen" },
      { acf_fc_layout: "video", youtube_url: "https://youtube.com/shorts/9L1cSL9u-U0?si=x", caption: "From the road" },
    ],
    quiet,
  );
  assert.deepEqual(out, [
    { layout: "pull_quote", quote: "A voice as grounded as the Mountain West", attribution: "Americana Highways" },
    { layout: "announcement", eyebrow: "New single", headline: "Everything You Are To Me", body: "Out now.", linkLabel: "Listen", linkUrl: "https://example.com/listen" },
    { layout: "video", id: "9L1cSL9u-U0", caption: "From the road" },
  ]);
});

test("a block missing its required field is dropped, not rendered blank", () => {
  const out = parseBlocks(
    [
      { acf_fc_layout: "announcement", eyebrow: "New", headline: "" },
      { acf_fc_layout: "pull_quote", quote: "   ", attribution: "x" },
      { acf_fc_layout: "video", youtube_url: "https://www.youtube.com/@MeghanClarisse" },
      { acf_fc_layout: "announcement", headline: "Kept" },
    ],
    quiet,
  );
  assert.deepEqual(out, [{ layout: "announcement", eyebrow: "", headline: "Kept", body: "", linkLabel: "", linkUrl: "" }]);
});

test("a link needs both its text and its address", () => {
  const [a, b] = parseBlocks(
    [
      { acf_fc_layout: "announcement", headline: "A", link_label: "Listen", link_url: "" },
      { acf_fc_layout: "announcement", headline: "B", link_label: "", link_url: "https://example.com" },
    ],
    quiet,
  );
  assert.equal(a.layout === "announcement" && a.linkLabel, "");
  assert.equal(b.layout === "announcement" && b.linkUrl, "");
});

test("an unknown layout renders nothing and is logged by row", () => {
  const logged: string[] = [];
  const out = parseBlocks(
    [{ acf_fc_layout: "carousel", slides: 3 }, { acf_fc_layout: "pull_quote", quote: "Q" }],
    (m) => logged.push(m),
  );
  assert.deepEqual(out, [{ layout: "pull_quote", quote: "Q", attribution: "" }]);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /row 1/);
  assert.match(logged[0], /carousel/);
});

test("a text block needs a heading and at least one paragraph; blank lines split paragraphs", () => {
  const out = parseBlocks(
    [
      { acf_fc_layout: "text", heading: " On the road ", body: "First paragraph.\n\n\nSecond one,\nsame paragraph.\n\n  " },
      { acf_fc_layout: "text", heading: "", body: "Orphan body" },
      { acf_fc_layout: "text", heading: "Empty", body: "   " },
    ],
    quiet,
  );
  assert.deepEqual(out, [{ layout: "text", heading: "On the road", paragraphs: ["First paragraph.", "Second one, same paragraph."] }]);
});

test("a photo block carries the image sized through Photon, its alt from the media library, and an optional caption", () => {
  const out = parseBlocks(
    [
      {
        acf_fc_layout: "photo",
        image: { url: "https://admin.megcmusic.com/wp-content/uploads/2026/09/stage-1024x683.jpg", width: 1024, height: 683, alt: "Meghan on stage" },
        caption: " Red Rocks, June ",
      },
      { acf_fc_layout: "photo", image: false, caption: "no image" },
      { acf_fc_layout: "photo", image: { url: "https://admin.megcmusic.com/wp-content/uploads/2026/09/x.jpg", width: 0, height: 0, alt: "" } },
    ],
    quiet,
  );
  assert.deepEqual(out, [
    {
      layout: "photo",
      src: "https://admin.megcmusic.com/wp-content/uploads/2026/09/stage.jpg?w=1600&quality=82&ssl=1",
      width: 1024,
      height: 683,
      alt: "Meghan on stage",
      caption: "Red Rocks, June",
    },
    {
      layout: "photo",
      src: "https://admin.megcmusic.com/wp-content/uploads/2026/09/x.jpg?w=1600&quality=82&ssl=1",
      width: 0,
      height: 0,
      alt: "",
      caption: "",
    },
  ]);
});
