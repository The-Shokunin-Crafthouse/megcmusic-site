// Sprint 13 Phase 1: the announcement block's five states, accessible names,
// tab order around the zone, and reduced-motion, on the injected "after" build.
import { chromium } from "playwright";
import fs from "node:fs";
const AFTER = process.env.AFTER_ORIGIN || "http://127.0.0.1:3102";
const OUT = process.env.OUT_DIR || "stages/03-build/sprint-13-home-blocks/output/phase-1-parity";
const browser = await chromium.launch();
const report = {};
for (const reduced of [false, true]) {
  const ctx = await browser.newContext({ reducedMotion: reduced ? "reduce" : "no-preference", hasTouch: false });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(AFTER + "/", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const zone = document.querySelector('section[aria-labelledby="home-blocks-heading"]');
    const h2 = document.getElementById("home-blocks-heading");
    const arts = [...zone.querySelectorAll("article")];
    const links = [...zone.querySelectorAll("a")];
    const accName = (a) => [...a.childNodes].map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
    return {
      zoneRole: zone.tagName.toLowerCase() + (zone.getAttribute("aria-labelledby") ? "[aria-labelledby]" : ""),
      zoneName: h2 ? h2.textContent.replace(/\s+/g, " ").trim() : null,
      articles: arts.map((a) => ({ labelledBy: a.getAttribute("aria-labelledby"), h3: a.querySelector("h3")?.id, h3Text: a.querySelector("h3")?.textContent.trim(), labelMatches: a.getAttribute("aria-labelledby") === a.querySelector("h3")?.id, eyebrow: a.querySelector("p")?.textContent.trim() ?? null, hasLink: !!a.querySelector("a") })),
      links: links.map((a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel"), name: accName(a), height: a.getBoundingClientRect().height, srOnly: a.querySelector("span[class*=srOnly]")?.textContent ?? null, arrow: !!a.querySelector("svg") })),
      unknownLayoutText: document.body.innerText.includes("This row must be dropped") ,
    };
  });
  // Tab-order walk: focus the last Instagram link, then Tab, Tab… and record neighbours.
  const walk = await page.evaluate(() => {
    const insta = document.querySelector('section[aria-labelledby="insta-heading"]');
    const last = [...insta.querySelectorAll('a[href], button')].filter((e) => e.checkVisibility?.() ?? true).at(-1);
    last.focus();
    return { start: last.tagName.toLowerCase() + ":" + (last.getAttribute("aria-label") || last.textContent).trim().slice(0, 40) };
  });
  const stops = [walk.start];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => { const e = document.activeElement; const sec = e.closest("section")?.getAttribute("aria-labelledby") || e.closest("div[class*=bootWrap], section")?.className || "?"; return e.tagName.toLowerCase() + ":" + (e.getAttribute("aria-label") || e.textContent).replace(/\s+/g, " ").trim().slice(0, 40) + " @" + sec; }));
  }
  // Five states on the first block's link.
  const sel = 'section[aria-labelledby="home-blocks-heading"] article a';
  const link = page.locator(sel).first();
  await link.scrollIntoViewIfNeeded();
  const read = (label) => page.evaluate(({ sel, label }) => { const a = document.querySelector(sel); const cs = getComputedStyle(a); return { state: label, color: cs.color, transform: cs.transform, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, outlineOffset: cs.outlineOffset, transition: cs.transitionDuration, minHeight: cs.minHeight }; }, { sel, label });
  await page.mouse.move(0, 0);
  const states = [await read("default")];
  await link.hover(); await page.waitForTimeout(400); states.push(await read("hover"));
  await page.mouse.move(0, 0); await page.waitForTimeout(400);
  // Keyboard focus → :focus-visible
  // Keyboard path: focus the Instagram handle link (the stop before the zone), then one Tab.
  await page.evaluate(() => { const insta = document.querySelector('section[aria-labelledby="insta-heading"]'); [...insta.querySelectorAll('a[href]')].filter((e) => e.checkVisibility?.() ?? true).at(-1).focus(); });
  await page.keyboard.press("Tab"); await page.waitForTimeout(150);
  const focusedIsLink = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), sel);
  states.push({ ...(await read("focus-visible")), focusedIsLink });
  await page.keyboard.press("Escape"); await page.evaluate(() => document.activeElement.blur());
  await link.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const box = await link.boundingBox();
  await page.mouse.move(box.x + 12, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(300); states.push({ ...(await read("active")), pressedIsLink: await page.evaluate((sel) => document.querySelector(sel).matches(":active"), sel) }); await page.mouse.up();
  states.push({ state: "disabled", note: "not applicable — a block with no address renders no link (parser rule)" });
  report[reduced ? "reducedMotion" : "normal"] = { info, tabWalk: stops, focusedIsLink, states };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/block-states.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
