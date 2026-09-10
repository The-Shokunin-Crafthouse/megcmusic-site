// Phase 2: the pull-quote block's markup against the spec, and a check that the
// zone adds no tab stop. Nothing interactive, so no five-state walk.
import { chromium } from "playwright";
import fs from "node:fs";
const AFTER = process.env.AFTER_ORIGIN || "http://127.0.0.1:3102";
const OUT = process.env.OUT_DIR || "stages/03-build/sprint-13-home-blocks/output/phase-2-parity";
const browser = await chromium.launch(); const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(AFTER + "/", { waitUntil: "load", timeout: 45000 }); await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const zone = document.querySelector('section[aria-labelledby="home-blocks-heading"]');
  const liner = document.querySelector('section[aria-labelledby="liner-heading"] blockquote');
  const quotes = [...zone.querySelectorAll("blockquote")];
  const cs = (el) => { const c = getComputedStyle(el); return { font: c.fontFamily.split(",")[0], style: c.fontStyle, size: c.fontSize, lineHeight: c.lineHeight, color: c.color, whiteSpace: c.whiteSpace }; };
  return {
    zoneName: document.getElementById("home-blocks-heading").textContent.replace(/\s+/g, " ").trim(),
    focusablesInZone: zone.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
    quotes: quotes.map((q) => ({ text: q.querySelector("p").textContent, cite: q.querySelector("cite")?.textContent ?? null, className: q.className, quoteTextCss: cs(q.querySelector("p")), panel: (() => { const c = getComputedStyle(q); return { bg: c.backgroundColor, borderLeft: c.borderLeft, radius: c.borderBottomRightRadius, padding: c.padding }; })(), height: q.getBoundingClientRect().height })),
    linerQuote: { className: liner.className, quoteTextCss: cs(liner.querySelector("p")), panel: (() => { const c = getComputedStyle(liner); return { bg: c.backgroundColor, borderLeft: c.borderLeft, radius: c.borderBottomRightRadius, padding: c.padding }; })() },
    droppedRowRendered: [...zone.querySelectorAll("cite")].some((c) => c.textContent === "Nobody"),
  };
});
await browser.close();
fs.writeFileSync(`${OUT}/quote-check.json`, JSON.stringify(info, null, 2) + "\n");
console.log(JSON.stringify(info, null, 2));
