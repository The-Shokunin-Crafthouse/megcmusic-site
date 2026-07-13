#!/usr/bin/env node
/**
 * Generates the Megs Playbook PWA's maskable/apple-touch icons from the
 * existing brand guitar-pick mark (`public/images/hero/logo-pick.svg`) —
 * Sprint 10 shell (P3). Run once at build-out time and commit the PNGs;
 * this script is the source of truth for them (studio rule: commit the
 * source for every rendered asset, not just the render).
 *
 * Composition: the pick SVG centered on a solid `--pb-bg` (#241420) ground
 * with generous safe-area padding (the pick fills ~55% of the canvas) so
 * OS icon masks (circle/squircle/rounded-square) never clip the mark.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const PICK_SVG_PATH = path.join(
  repoRoot,
  "public/images/hero/logo-pick.svg",
);
const OUT_DIR = path.join(repoRoot, "public/megs-playbook/icons");

// --pb-bg (_config/design-system/token-map.css) — the manifest/icon layer
// can't read CSS custom properties, so the value is inlined here with a
// pointer back to the token it must stay in lockstep with.
const PB_BG = "#241420";

const SIZES = [
  { size: 180, filename: "apple-touch-icon.png" },
  { size: 192, filename: "icon-192.png" },
  { size: 512, filename: "icon-512.png" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const pickSvg = await readFile(PICK_SVG_PATH, "utf8");

  for (const { size, filename } of SIZES) {
    // The pick occupies ~55% of the canvas, centered, leaving safe-area
    // padding on all sides for maskable-icon crop circles.
    const pickSize = Math.round(size * 0.55);
    const offset = Math.round((size - pickSize) / 2);

    const pickPng = await sharp(Buffer.from(pickSvg))
      .resize(pickSize, pickSize, { fit: "contain" })
      .png()
      .toBuffer();

    const canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: PB_BG,
      },
    });

    const outPath = path.join(OUT_DIR, filename);
    const composed = await canvas
      .composite([{ input: pickPng, left: offset, top: offset }])
      .png()
      .toBuffer();

    await writeFile(outPath, composed);
    console.log(`wrote ${path.relative(repoRoot, outPath)} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
