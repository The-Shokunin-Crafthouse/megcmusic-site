import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHomeBlocks } from "./home-blocks";

const quiet = () => {};

test("an empty zone is an empty list — ACF's false and a missing key alike", () => {
  assert.deepEqual(parseHomeBlocks(false, quiet), []);
  assert.deepEqual(parseHomeBlocks(undefined, quiet), []);
  assert.deepEqual(parseHomeBlocks([], quiet), []);
});

test("each layout parses its fields, in Meg's order", () => {
  const out = parseHomeBlocks(
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
  const out = parseHomeBlocks(
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
  const [a, b] = parseHomeBlocks(
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
  const out = parseHomeBlocks(
    [{ acf_fc_layout: "carousel", slides: 3 }, { acf_fc_layout: "pull_quote", quote: "Q" }],
    (m) => logged.push(m),
  );
  assert.deepEqual(out, [{ layout: "pull_quote", quote: "Q", attribution: "" }]);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /row 1/);
  assert.match(logged[0], /carousel/);
});
