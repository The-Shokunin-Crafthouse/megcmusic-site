/**
 * Press-kit thumbnails (ADR 2026-09-23): the picture beside each download on
 * the home page's Electronic Press Kit is made from the file itself — the
 * first page of the PDF, or the uploaded image — every build, so it always
 * shows what the visitor downloads. There is no thumbnail field for Meg to
 * keep in step.
 *
 * Pure apart from rendering: no network and no disk here, so it is tested on
 * its own (`epk-thumbs.test.mjs`). scripts/fetch-epk-thumbs.mjs does the I/O.
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";

/**
 * Two widths for the browser to pick from. The frame is 84×108 on phones and
 * 112×145 from 768px up (EPK.module.css); 224 and 336 cover both at 2× and 3×.
 * 112:145 is almost exactly a US Letter page, so a letter PDF fills it whole.
 */
export const THUMB_SIZES = [
  { width: 224, height: 290 },
  { width: 336, height: 435 },
];
export const PUBLIC_DIR = "/images/epk-thumbs";
const WEBP_QUALITY = 80;

/** What a file row can be turned into; anything else keeps the site photo. */
function kindOf(file) {
  const mime = String(file.mime_type ?? "").toLowerCase();
  const ext = String(file.url ?? "").split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (/^image\/(jpeg|png|webp|gif|avif)$/.test(mime) || ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return "image";
  }
  return null;
}

/**
 * One job per distinct file in the press-kit rows (ACF `kit_items`, raw).
 * The name carries the attachment id plus a hash of its url, modified time
 * and size, so a replaced PDF gets a new file name and nothing serves the old
 * picture from a cache.
 */
export function thumbJobs(rows) {
  const jobs = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const file = row && typeof row.file === "object" && row.file ? row.file : null;
    if (!file || typeof file.url !== "string" || !file.url || jobs.has(file.url)) continue;
    const kind = kindOf(file);
    if (!kind) continue;
    const id = Number(file.ID ?? file.id) || 0;
    const version = createHash("sha256")
      .update([file.url, file.modified ?? "", file.filesize ?? ""].join("|"))
      .digest("hex")
      .slice(0, 8);
    jobs.set(file.url, { url: file.url, kind, base: `epk-${id}-${version}` });
  }
  return [...jobs.values()];
}

/** What src/generated/epk-thumbs.json holds for one file. */
export function manifestEntry(base) {
  const at = (s) => `${PUBLIC_DIR}/${base}-${s.width}.webp`;
  const largest = THUMB_SIZES.at(-1);
  return {
    src: at(largest),
    srcSet: THUMB_SIZES.map((s) => `${at(s)} ${s.width}w`).join(", "),
    width: largest.width,
    height: largest.height,
  };
}

const isPdf = (bytes) => bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"));

/** Page 1 of a PDF as a PNG, wide enough to downscale cleanly to the largest size. */
async function firstPagePng(bytes) {
  const [{ getDocument }, { createCanvas }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("@napi-rs/canvas"),
  ]);
  const root = path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    verbosity: 0,
    // Fonts a PDF names but does not embed, and CJK character maps.
    standardFontDataUrl: path.join(root, "standard_fonts") + path.sep,
    cMapUrl: path.join(root, "cmaps") + path.sep,
    cMapPacked: true,
  });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const unit = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (THUMB_SIZES.at(-1).width * 2) / unit.width });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // A PDF page with no background is white paper, not transparent.
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return canvas.toBuffer("image/png");
  } finally {
    await task.destroy();
  }
}

/**
 * The file's picture at every size, as WebP. Fills the frame, keeping the top
 * of the page (where a one-sheet carries its name and photo) when the shape
 * differs. Throws on a file it cannot read, naming why.
 */
export async function renderThumbs(bytes, kind) {
  let source;
  if (kind === "pdf") {
    if (!isPdf(bytes)) throw new Error("not a PDF (no %PDF- header) — the host may have served an error page instead");
    source = await firstPagePng(bytes);
  } else {
    source = bytes;
  }
  return Promise.all(
    THUMB_SIZES.map(async ({ width, height }) => ({
      width,
      height,
      webp: await sharp(source, { animated: false })
        .flatten({ background: "#ffffff" })
        .resize(width, height, { fit: "cover", position: "top" })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    })),
  );
}
