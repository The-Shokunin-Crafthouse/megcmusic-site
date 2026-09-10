// Sprint 13 Phase 1 zone proof. Before (3101, main) has no blocks section;
// after (3102, branch + injected rows) has one. Above = rows above the zone's
// top on both sides; below = rows after the zone on after vs rows after the
// same seam (Instagram section's bottom edge) on before. Shared viewport
// height, 15s image wait, TOL 40, ±1-row recount — the Sprint 12 method.
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
const BEFORE = process.env.BEFORE_ORIGIN || "http://127.0.0.1:3101", AFTER = process.env.AFTER_ORIGIN || "http://127.0.0.1:3102";
const TAG = process.env.TAG || "real"; const TOL = 40;
const OUT = process.env.OUT_DIR || "stages/03-build/sprint-13-home-blocks/output/phase-1-parity";
const WIDTHS = (process.env.WIDTHS || "390,768,1024,1440,1920").split(",").map(Number);
const SEAM = 'section[aria-labelledby="insta-heading"]';
const ZONE = 'section[aria-labelledby="home-blocks-heading"]';
async function settle(page) {
  await page.addStyleTag({ content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;animation-iteration-count:1!important;scroll-behavior:auto!important}` });
  await page.evaluate(async () => { const step = window.innerHeight; for (let y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(300);
  await page.evaluate(async () => { const pending = [...document.images].filter((i) => !i.complete); await Promise.race([Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 5000))]); if (document.fonts) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]); });
  await page.waitForTimeout(200);
}
async function cap(ctx, origin, width, forceHeight) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: 900 });
  await page.goto(origin + "/", { waitUntil: "load", timeout: 45000 });
  await settle(page);
  const h = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  // VH_CAP: Home carries one 100vh section, so the page grows 1:1 with the
  // viewport height and a viewport sized to the page pushes the seam past
  // Chromium's 16,384 px capture ceiling at every width (learning #233).
  // 5,000 keeps every width's ballooned page under the ceiling.
  const CAP = Number(process.env.VH_CAP || 16000);
  const vh = Math.min(forceHeight ?? Math.ceil(h), CAP);
  await page.setViewportSize({ width, height: vh });
  await page.waitForTimeout(250);
  await page.evaluate(async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const pending = [...document.images].filter((i) => !i.complete); if (!pending.length) break; await new Promise((r) => setTimeout(r, 200)); } });
  await page.waitForTimeout(200);
  const rect = await page.evaluate(({ SEAM, ZONE }) => {
    const z = document.querySelector(ZONE);
    if (z) { const r = z.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, zone: true }; }
    const s = document.querySelector(SEAM).getBoundingClientRect();
    return { top: s.bottom + scrollY, bottom: s.bottom + scrollY, zone: false };
  }, { SEAM, ZONE });
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return { rect, png, h, vh };
}
const browser = await chromium.launch();
const ctx = await browser.newContext(process.env.RM ? { reducedMotion: "reduce" } : {});
const rows = [];
for (const width of WIDTHS) {
  const b = await cap(ctx, BEFORE, width); const a = await cap(ctx, AFTER, width, b.vh);
  const bi = sharp(b.png), ai = sharp(a.png);
  const bm = await bi.metadata(), am = await ai.metadata();
  const scale = bm.width / width;
  const braw = await bi.raw().toBuffer(), araw = await ai.raw().toBuffer();
  const ch = bm.channels, rowB = bm.width * ch;
  const topB = Math.floor(b.rect.top * scale), topA = Math.floor(a.rect.top * scale);
  const botB = Math.ceil(b.rect.bottom * scale), botA = Math.ceil(a.rect.bottom * scale);
  const cmp = (bStart, aStart, len) => { let bad = 0; for (let y = 0; y < len; y++) { const bo = (bStart + y) * rowB, ao = (aStart + y) * rowB; for (let x = 0; x < rowB; x += ch) { for (let c = 0; c < 3; c++) { if (Math.abs(braw[bo + x + c] - araw[ao + x + c]) > TOL) { bad++; break; } } } } return bad; };
  const cmpTol = (bStart, aStart, len) => { let bad = 0; for (let y = 1; y < len - 1; y++) { const bo = (bStart + y) * rowB; for (let x = 0; x < rowB; x += ch) { let allDiff = true; for (const dy of [0, -1, 1]) { const ao = (aStart + y + dy) * rowB; let d = false; for (let c = 0; c < 3; c++) if (Math.abs(braw[bo + x + c] - araw[ao + x + c]) > TOL) { d = true; break; } if (!d) { allDiff = false; break; } } if (allDiff) bad++; } } return bad; };
  const aboveRows = Math.min(topB, topA);
  const belowLen = Math.min(bm.height - botB, am.height - botA);
  const above = cmp(0, 0, aboveRows), below = cmp(botB, botA, belowLen), belowTol = cmpTol(botB, botA, belowLen);
  const dir = `${OUT}/shots/${TAG}`;
  fs.mkdirSync(dir, { recursive: true });
  if (a.rect.zone) await sharp(a.png).extract({ left: 0, top: topA, width: am.width, height: botA - topA }).toFile(`${dir}/${width}-zone-after.png`).catch(() => {});
  // Seam context: 200 css px either side of the seam on before, and the same span around the zone on after.
  const pad = Math.round(200 * scale);
  await sharp(b.png).extract({ left: 0, top: Math.max(0, topB - pad), width: bm.width, height: Math.min(bm.height - Math.max(0, topB - pad), (botB - topB) + 2 * pad) }).toFile(`${dir}/${width}-seam-before.png`).catch(() => {});
  await sharp(a.png).extract({ left: 0, top: Math.max(0, topA - pad), width: am.width, height: Math.min(am.height - Math.max(0, topA - pad), (botA - topA) + 2 * pad) }).toFile(`${dir}/${width}-seam-after.png`).catch(() => {});
  const row = { width, zoneRendered: { before: b.rect.zone, after: a.rect.zone }, seamTopBefore: b.rect.top, zoneTopAfter: a.rect.top, sameTop: topB === topA, zoneHeightAfter: a.rect.bottom - a.rect.top, pageHeightBefore: b.h, pageHeightAfter: a.h, deltaPage: a.h - b.h, pxAboveDiffering: above, pxBelowDiffering: below, pxBelowDifferingAllowing1pxShift: belowTol, pxAboveCompared: aboveRows * bm.width, pxBelowCompared: belowLen * bm.width };
  rows.push(row); console.log(JSON.stringify(row));
}
await browser.close();
fs.writeFileSync(`${OUT}/zone-proof-${TAG}.json`, JSON.stringify(rows, null, 2) + "\n");
