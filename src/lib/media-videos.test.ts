import { test } from "node:test";
import assert from "node:assert/strict";
import { youTubeId, parseVideoIds } from "./media-videos";

test("every link shape Meg might paste resolves to the same id", () => {
  const id = "9L1cSL9u-U0";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/shorts/${id}?si=VApLsMHlPxgdXdZk`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtu.be/${id}?t=12`,
    `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    id,
    `  ${id}  `,
  ]) {
    assert.equal(youTubeId(url), id, url);
  }
});

test("a link that is not a YouTube video is not an id", () => {
  for (const url of ["", "https://example.com/watch", "https://www.youtube.com/@MeghanClarisse", "not-an-id", null, undefined]) {
    assert.equal(youTubeId(url as string), null, String(url));
  }
});

test("page-body embeds are parsed in order, once each, Shorts included", () => {
  const html = `<iframe src="https://www.youtube.com/embed/A8E_XRwkhTk"></iframe>
    <a href="https://youtube.com/shorts/9L1cSL9u-U0?si=x">short</a>
    <a href="https://www.youtube.com/watch?v=A8E_XRwkhTk">again</a>`;
  assert.deepEqual(parseVideoIds(html), ["A8E_XRwkhTk", "9L1cSL9u-U0"]);
});
