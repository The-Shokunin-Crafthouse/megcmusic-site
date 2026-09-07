#!/usr/bin/env node
/**
 * Sprint 11 Phase 5 — interaction states and reduced motion.
 *
 * Two questions the screenshot pairs cannot answer:
 *   1. Under prefers-reduced-motion: reduce, does the page still deliver its
 *      content — and identically to before the sprint?
 *   2. Does every interactive element still take focus and show a ring?
 *
 * Both are asked of both builds and compared. Probes are functions, never
 * strings: page.evaluate given a string returns the function object, which
 * serialises to undefined, and undefined === undefined reports a pass.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BEFORE = "http://127.0.0.1:3101";
const AFTER = "http://127.0.0.1:3102";
const ROUTES = ["/", "/music", "/epk", "/media", "/poetry", "/fyc/shadows-of-a-ghost-town"];

const TEXT = () => document.body.innerText.replace(/\s+/g, " ").trim();

/** Focusable elements and whether each takes a visible ring on :focus-visible. */
const FOCUS_AUDIT = () => {
  const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  // A closed <dialog> is still in the DOM and would fail the audit as a
  // hidden-but-focusable element (learning #155).
  const els = [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility?.() ?? true);
  return {
    count: els.length,
    // Which of them declare no focus styling at all — the studio's untouchable
    // rule is that focus is visible and styled, never the browser default.
    labels: els.slice(0, 200).map((e) => `${e.tagName.toLowerCase()}:${(e.textContent || "").trim().slice(0, 28)}`),
  };
};

async function probe(context, origin, route, reduced) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + route, { waitUntil: "load", timeout: 45000 });
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  const text = await page.evaluate(TEXT);
  const focus = await page.evaluate(FOCUS_AUDIT);
  if (typeof text !== "string" || !text) throw new Error(`text probe empty ${origin}${route}`);
  if (!focus || typeof focus.count !== "number") throw new Error(`focus probe empty ${origin}${route}`);
  await page.close();
  return { text, focus };
}

/** Tab through the first N stops and record which show a non-none outline. */
async function focusRings(context, origin, route, n = 25) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + route, { waitUntil: "load", timeout: 45000 });
  const stops = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const drawn = (el) => {
        const cs = getComputedStyle(el);
        return (cs.outlineStyle !== "none" && cs.outlineStyle !== "" && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== "none";
      };
      // The ring is not always on the focused element. A stretched link sets
      // `outline: none` on the <a> and draws the ring on its card via
      // `:has(a:focus-visible)` — a probe that reads only the focused node
      // reports that correct pattern as an unstyled focus.
      let node = e, depth = 0, where = null, outline = null;
      while (node && depth < 4) {
        if (drawn(node)) {
          const cs = getComputedStyle(node);
          where = depth === 0 ? "self" : `ancestor+${depth}`;
          outline = `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
          break;
        }
        node = node.parentElement; depth++;
      }
      return {
        tag: e.tagName.toLowerCase(),
        label: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 32),
        ring: where !== null,
        ringOn: where,
        outline,
      };
    });
    if (!s) break;
    stops.push(s);
  }
  await page.close();
  return stops;
}

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
const report = [];

for (const route of ROUTES) {
  const [bNormal, bReduced, aNormal, aReduced] = [
    await probe(context, BEFORE, route, false),
    await probe(context, BEFORE, route, true),
    await probe(context, AFTER, route, false),
    await probe(context, AFTER, route, true),
  ];
  const bRings = await focusRings(context, BEFORE, route);
  const aRings = await focusRings(context, AFTER, route);
  const row = {
    route,
    // Reduced motion must not cost content on either build.
    reducedKeepsContentBefore: bReduced.text === bNormal.text,
    reducedKeepsContentAfter: aReduced.text === aNormal.text,
    // And the reduced-motion render must be as unchanged as the normal one.
    reducedTextSame: bReduced.text === aReduced.text,
    focusCount: { before: bNormal.focus.count, after: aNormal.focus.count },
    tabStops: { before: bRings.length, after: aRings.length },
    ringsWithoutStyling: {
      before: bRings.filter((s) => !s.ring).map((s) => `${s.tag}:${s.label}`),
      after: aRings.filter((s) => !s.ring).map((s) => `${s.tag}:${s.label}`),
    },
    tabOrderSame: JSON.stringify(bRings.map((s) => s.tag + s.label)) === JSON.stringify(aRings.map((s) => s.tag + s.label)),
  };
  report.push(row);
  console.log(
    `${route}  reduced(before/after keeps content)=${row.reducedKeepsContentBefore}/${row.reducedKeepsContentAfter}` +
    `  reducedSame=${row.reducedTextSame}  focusable=${row.focusCount.before}->${row.focusCount.after}` +
    `  tabStops=${row.tabStops.before}->${row.tabStops.after}  tabOrderSame=${row.tabOrderSame}` +
    `  unstyledFocus=${row.ringsWithoutStyling.after.length}`,
  );
}

await browser.close();
fs.writeFileSync(process.argv[2] || "./states.json", JSON.stringify(report, null, 2));
console.log("\nwrote states.json");
