import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePhotos } from "./media-photos";

const WP_HOST = "admin.megcmusic.com";

/** One liner sheet exactly as WordPress stores it on a release page: the `src`
 *  frozen at the pre-cutover public host, the `srcset` already rewritten by
 *  Jetpack to the host WordPress serves from today. */
const linerTag = `<img data-recalc-dims="1" decoding="async" width="525" height="525" loading="lazy" data-id="4352" src="https://i0.wp.com/www.megcmusic.com/wp-content/uploads/2025/07/newest-credits-1024x1024.png?resize=525%2C525&#038;ssl=1" alt="" class="wp-image-4352" srcset="https://i0.wp.com/admin.megcmusic.com/wp-content/uploads/2025/07/newest-credits.png?resize=1024%2C1024&amp;ssl=1 1024w" />`;

test("a Photon src frozen at the old public host is re-pointed at WordPress", () => {
  const [photo] = parsePhotos(linerTag);
  for (const url of [photo.thumb, photo.full]) {
    assert.equal(
      new URL(url).pathname,
      `/${WP_HOST}/wp-content/uploads/2025/07/newest-credits.png`,
      url,
    );
    assert.ok(!url.includes("www.megcmusic.com"), url);
  }
});

test("the size suffix is still stripped, so both renditions come off one original", () => {
  const [photo] = parsePhotos(linerTag);
  assert.equal(photo.thumb, photo.full.replace("w=1600", "w=720"));
  assert.ok(photo.thumb.endsWith("newest-credits.png?w=720&quality=82&ssl=1"));
});

test("a Photon src already on the WordPress host is left alone", () => {
  const [photo] = parsePhotos(
    `<img src="https://i0.wp.com/${WP_HOST}/wp-content/uploads/2026/09/lyric-4350-01.jpg?fit=1400%2C1400&ssl=1" alt="Bright Lights" />`,
  );
  assert.equal(
    photo.full,
    `https://i0.wp.com/${WP_HOST}/wp-content/uploads/2026/09/lyric-4350-01.jpg?w=1600&quality=82&ssl=1`,
  );
  assert.equal(photo.alt, "Bright Lights");
});

test("a direct upload on the old host is re-pointed too", () => {
  const [photo] = parsePhotos(
    `<img src="https://www.megcmusic.com/wp-content/uploads/2025/07/5-1-1024x1024.png" alt="" />`,
  );
  assert.equal(
    photo.full,
    `https://${WP_HOST}/wp-content/uploads/2025/07/5-1.png?w=1600&quality=82&ssl=1`,
  );
});

test("a non-uploads image keeps its host — rehosting is for WordPress media only", () => {
  const [photo] = parsePhotos(
    `<img src="https://images.example.com/press/shot.jpg" alt="" />`,
  );
  assert.ok(photo.full.startsWith("https://images.example.com/press/shot.jpg"));
});

test("re-pointed duplicates of one original collapse to a single photo", () => {
  const photos = parsePhotos(
    `<img src="https://i0.wp.com/www.megcmusic.com/wp-content/uploads/2025/07/5-1-1024x1024.png?ssl=1" alt="" />` +
      `<img src="https://i0.wp.com/${WP_HOST}/wp-content/uploads/2025/07/5-1-300x300.png?ssl=1" alt="" />`,
  );
  assert.equal(photos.length, 1);
});

test("an image with no alt still gets one", () => {
  const [photo] = parsePhotos(linerTag);
  assert.equal(photo.alt, "Meghan Clarisse");
});
