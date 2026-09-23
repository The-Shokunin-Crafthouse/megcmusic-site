import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { thumbJobs, renderThumbs, manifestEntry, THUMB_SIZES } from "./epk-thumbs.mjs";

/** A valid one-page PDF: a red band across the top quarter of a white page. */
function pdfWith(content, [w, h] = [612, 792]) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
const RED_TOP = pdfWith("1 0 0 rg 0 594 612 198 re f");

const pixel = async (webp, x, y) => {
  const { data, info } = await sharp(webp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const near = (rgb, target) => rgb.every((c, i) => Math.abs(c - target[i]) < 40);

const pdfRow = (over = {}) => ({
  title: "EPK",
  link: "",
  file: {
    ID: 6480,
    url: "https://admin.megcmusic.com/wp-content/uploads/2026/09/Meghan-Clarisse-EPK-1.pdf",
    mime_type: "application/pdf",
    filesize: 1125413,
    modified: "2026-09-21 15:45:27",
    ...over,
  },
});

test("a PDF row is a job; a link row and an unsupported file are not", () => {
  const jobs = thumbJobs([
    pdfRow(),
    { title: "Sample Set List", file: false, link: "https://admin.megcmusic.com/sample-set-list/" },
    pdfRow({ ID: 7, url: "https://x.test/a.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    pdfRow({ ID: 8, url: "https://x.test/photo.jpg", mime_type: "image/jpeg" }),
  ]);
  assert.deepEqual(
    jobs.map((j) => [j.url, j.kind]),
    [
      ["https://admin.megcmusic.com/wp-content/uploads/2026/09/Meghan-Clarisse-EPK-1.pdf", "pdf"],
      ["https://x.test/photo.jpg", "image"],
    ],
  );
});

test("the same file on two rows is rendered once", () => {
  assert.equal(thumbJobs([pdfRow(), pdfRow({ title: "again" })]).length, 1);
});

test("replacing the PDF gives the thumbnail a new name, so no browser or CDN keeps the old one", () => {
  const [a] = thumbJobs([pdfRow()]);
  const [same] = thumbJobs([pdfRow()]);
  const [edited] = thumbJobs([pdfRow({ modified: "2026-10-01 09:00:00" })]);
  const [resized] = thumbJobs([pdfRow({ filesize: 999 })]);
  assert.equal(a.base, same.base);
  assert.notEqual(a.base, edited.base);
  assert.notEqual(a.base, resized.base);
  assert.match(a.base, /^epk-6480-[0-9a-f]{8}$/);
});

test("a PDF's first page becomes one WebP per size, showing what is on the page", async () => {
  const out = await renderThumbs(RED_TOP, "pdf");
  assert.deepEqual(
    out.map((t) => [t.width, t.height]),
    THUMB_SIZES.map((s) => [s.width, s.height]),
  );
  for (const t of out) {
    const meta = await sharp(t.webp).metadata();
    assert.equal(meta.format, "webp");
    assert.deepEqual([meta.width, meta.height], [t.width, t.height]);
    assert.ok(near(await pixel(t.webp, t.width >> 1, 4), [255, 0, 0]), "top of the page is the red band");
    assert.ok(near(await pixel(t.webp, t.width >> 1, t.height - 4), [255, 255, 255]), "the rest is the white page");
  }
});

test("a landscape PDF still fills the frame, keeping the top of the page", async () => {
  const out = await renderThumbs(pdfWith("0 0 1 rg 0 400 792 212 re f", [792, 612]), "pdf");
  const big = out.at(-1);
  assert.deepEqual([big.width, big.height], [THUMB_SIZES.at(-1).width, THUMB_SIZES.at(-1).height]);
  assert.ok(near(await pixel(big.webp, big.width >> 1, 4), [0, 0, 255]));
  assert.ok(near(await pixel(big.webp, big.width >> 1, big.height - 4), [255, 255, 255]), "page to the bottom edge, no bars");
});

test("an HTML page served in place of the PDF (a host bot check) is refused, not rendered", async () => {
  await assert.rejects(renderThumbs(Buffer.from("<!doctype html><title>406</title>"), "pdf"), /not a PDF/);
});

test("an uploaded image is resized into the same frame", async () => {
  const png = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#00ff00" } }).png().toBuffer();
  const out = await renderThumbs(png, "image");
  assert.deepEqual(out.map((t) => t.width), THUMB_SIZES.map((s) => s.width));
  assert.ok(near(await pixel(out[0].webp, 10, 10), [0, 255, 0]));
});

test("the manifest entry lists every size for the browser to choose from", () => {
  assert.deepEqual(manifestEntry("epk-6480-abcd1234"), {
    src: "/images/epk-thumbs/epk-6480-abcd1234-336.webp",
    srcSet: "/images/epk-thumbs/epk-6480-abcd1234-224.webp 224w, /images/epk-thumbs/epk-6480-abcd1234-336.webp 336w",
    width: 336,
    height: 435,
  });
});
