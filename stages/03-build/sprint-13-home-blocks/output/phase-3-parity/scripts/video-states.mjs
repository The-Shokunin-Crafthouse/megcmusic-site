// Sprint 13 Phase 3: the video block's names, tab order, five states on the
// facade button, the swap to the iframe, and reduced motion — after build only.
import { chromium } from "playwright";
import fs from "node:fs";
const AFTER = process.env.AFTER_ORIGIN || "http://127.0.0.1:3102";
const OUT = process.env.OUT_DIR || "stages/03-build/sprint-13-home-blocks/output/phase-3-parity";
const ZONE = 'section[aria-labelledby="home-blocks-heading"]';
const browser = await chromium.launch();
const report = {};
for (const reduced of [false, true]) {
  const ctx = await browser.newContext({ reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(AFTER + "/", { waitUntil: "load", timeout: 45000 }); await page.waitForTimeout(500);
  const info = await page.evaluate((ZONE) => {
    const zone = document.querySelector(ZONE);
    const figs = [...zone.querySelectorAll("figure")];
    return {
      zoneName: document.getElementById("home-blocks-heading").textContent.replace(/\s+/g, " ").trim(),
      figures: figs.map((f) => { const b = f.querySelector("button"); const box = f.querySelector("button").parentElement; const r = box.getBoundingClientRect(); return { buttonName: b.getAttribute("aria-label"), thumb: b.querySelector("img")?.getAttribute("src"), thumbAlt: b.querySelector("img")?.getAttribute("alt"), caption: f.querySelector("figcaption")?.textContent ?? null, boxClasses: box.className, aspect: +(r.width / r.height).toFixed(3), width: Math.round(r.width) }; }),
      focusablesInZone: zone.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])').length,
      droppedRowRendered: document.body.innerText.includes("Must be dropped"),
      galleryFacadeClasses: document.querySelector('section[aria-labelledby="videos-heading"] button[aria-label^="Play"]')?.className,
    };
  }, ZONE);
  // Tab walk from the Instagram handle link.
  await page.evaluate(() => { const insta = document.querySelector('section[aria-labelledby="insta-heading"]'); [...insta.querySelectorAll('a[href]')].filter((e) => e.checkVisibility?.() ?? true).at(-1).focus(); });
  const stops = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); stops.push(await page.evaluate(() => { const e = document.activeElement; return e.tagName.toLowerCase() + ":" + (e.getAttribute("aria-label") || e.textContent).replace(/\s+/g, " ").trim().slice(0, 44) + " @" + (e.closest("section")?.getAttribute("aria-labelledby") || "?"); })); }
  // Five states on the first block's play button (read the glyph's transform and the button's outline).
  const sel = `${ZONE} figure button`;
  const btn = page.locator(sel).first();
  await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await page.mouse.move(0, 0); await page.waitForTimeout(400);
  const read = (label) => page.evaluate(({ sel, label }) => { const b = document.querySelector(sel); const g = b.querySelector("svg"); const im = b.querySelector("img"); const cb = getComputedStyle(b), cg = getComputedStyle(g), ci = getComputedStyle(im); return { state: label, outline: `${cb.outlineStyle} ${cb.outlineWidth} ${cb.outlineColor}`, outlineOffset: cb.outlineOffset, glyphTransform: cg.transform, imgTransform: ci.transform, glyphTransition: cg.transitionDuration, imgTransition: ci.transitionDuration, cursor: cb.cursor }; }, { sel, label });
  const states = [await read("default")];
  await btn.hover(); await page.waitForTimeout(500); states.push(await read("hover"));
  await page.mouse.move(0, 0); await page.waitForTimeout(500);
  await page.evaluate(() => { const insta = document.querySelector('section[aria-labelledby="insta-heading"]'); [...insta.querySelectorAll('a[href]')].filter((e) => e.checkVisibility?.() ?? true).at(-1).focus(); });
  await page.keyboard.press("Tab"); await page.waitForTimeout(150);
  const focusedIsButton = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), sel);
  states.push({ ...(await read("focus-visible")), focusedIsButton });
  await page.evaluate(() => document.activeElement.blur()); await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(400);
  states.push({ ...(await read("active")), pressedIsButton: await page.evaluate((sel) => document.querySelector(sel).matches(":active"), sel) });
  await page.mouse.up(); await page.waitForTimeout(300);
  states.push({ state: "disabled", note: "not applicable — an invalid link renders no block (parser rule)" });
  // After the click the facade is an iframe.
  const afterClick = await page.evaluate((ZONE) => { const f = document.querySelector(`${ZONE} figure`); const fr = f.querySelector("iframe"); return { iframe: !!fr, src: fr?.getAttribute("src"), title: fr?.getAttribute("title"), buttonGone: !f.querySelector("button"), iframeCount: document.querySelectorAll("iframe").length }; }, ZONE);
  report[reduced ? "reducedMotion" : "normal"] = { info, tabWalk: stops, focusedIsButton, states, afterClick };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/video-states.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
