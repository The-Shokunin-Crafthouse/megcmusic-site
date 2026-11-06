/**
 * Re-renders the nav snapshots in this folder from a running site.
 * Reduced motion makes the reveal settle; a wait for document.fonts means the
 * shots use the real Open Sans.
 *
 *   node previews/pr-173-epk/render.mjs [origin]
 *
 * The origin defaults to production.
 */
import path from "node:path";
import { chromium } from "playwright";

const ORIGIN = process.argv[2] || "https://megcmusic.com";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const HEIGHT = 200;

const browser = await chromium.launch();

async function open(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/epk`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  return { context, page };
}

for (const width of [390, 768, 1024, 1440, 1920]) {
  const { context, page } = await open(width, HEIGHT);
  await page.screenshot({ path: path.join(OUT, `nav-${width}.png`) });
  await context.close();
}

const { context, page } = await open(390, 900);
await page.getByRole("button", { name: /menu/i }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "nav-390-menu-open.png") });
await context.close();

await browser.close();
