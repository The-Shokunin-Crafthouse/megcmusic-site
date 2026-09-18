import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePressPage } from "./press-page";

const WP = "https://admin.megcmusic.com";

test("paragraphs keep their links as runs; text outside links is plain", () => {
  const html = `<p>Top 10 on <a href="https://thealternateroot.com/x">The Alternate Root</a> October 2025</p>
<p><a href="https://jackmesenbourg.com/r">Jack Mesenbourg</a></p>`;
  assert.deepEqual(parsePressPage(html), [
    { type: "paragraph", runs: [{ text: "Top 10 on " }, { text: "The Alternate Root", href: "https://thealternateroot.com/x" }, { text: " October 2025" }] },
    { type: "paragraph", runs: [{ text: "Jack Mesenbourg", href: "https://jackmesenbourg.com/r" }] },
  ]);
});

test("a blockquote is a quote block; a following paragraph naming the source is its attribution", () => {
  const html = `<blockquote class="wp-block-quote"><p>“ Meghan’s EP is an amazing success .”</p><cite>Joshua D’Estrada</cite></blockquote><p>President of K4CO Radio</p>`;
  assert.deepEqual(parsePressPage(html), [
    { type: "quote", text: "Meghan’s EP is an amazing success .", attribution: "Joshua D’Estrada" },
    { type: "paragraph", runs: [{ text: "President of K4CO Radio" }] },
  ]);
});

test("a blockquote with no cite takes the paragraphs after its first as the attribution, joined with a middle dot", () => {
  const html = `<blockquote class="wp-block-quote"><p>“<em>An amazing success</em>.”</p><p>Joshua D’Estrada</p><p>President of K4CO Radio</p><figure class="wp-block-gallery"><figure class="wp-block-image"><img src="${WP}/wp-content/uploads/2024/12/Kindred-Spirits-Cover-1024x1024.png" alt="" /></figure></figure></blockquote>`;
  const out = parsePressPage(html);
  assert.deepEqual(out[0], { type: "quote", text: "An amazing success .", attribution: "Joshua D’Estrada · President of K4CO Radio" });
  assert.equal(out.length, 2);
  assert.equal(out[1].type, "image");
  assert.match(out[1].type === "image" ? out[1].src : "", /Kindred-Spirits-Cover\.png\?w=1600/);
});

test("images in figures become image blocks through the gallery's URL rules", () => {
  const html = `<figure class="wp-block-image"><img src="${WP}/wp-content/uploads/2026/02/review-1024x683.jpg" alt="The review in print" /></figure><p></p><p>   </p>`;
  const out = parsePressPage(html);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, "image");
  assert.equal(out[0].type === "image" && out[0].alt, "The review in print");
  assert.match(out[0].type === "image" ? out[0].src : "", /review\.jpg\?w=1600/);
});

test("only http(s) links survive; entities decode; empty input is empty", () => {
  const html = `<p>See <a href="javascript:alert(1)">this</a> &amp; <a href="mailto:x@y">that</a> — <a href="https://ok.example/a?b=1&amp;c=2">ok</a></p>`;
  assert.deepEqual(parsePressPage(html), [
    { type: "paragraph", runs: [{ text: "See this & that — " }, { text: "ok", href: "https://ok.example/a?b=1&c=2" }] },
  ]);
  assert.deepEqual(parsePressPage(""), []);
});
