#!/usr/bin/env node
/**
 * Sprint 11 Phase 5 — parity harness.
 *
 * Drives two locally-built servers (before = pre-sprint commit, after = main)
 * and, per route per breakpoint, captures a full-page screenshot from each,
 * then diffs three things that must be identical: the pixels, the rendered
 * text, and the head metadata.
 *
 * A text diff alone would pass a page that lost a section and gained an
 * identically-worded one; a pixel diff alone cannot say what moved. Both run.
 *
 * Usage: node parity.mjs [--routes a,b] [--widths 390,768]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = path.resolve(process.argv[2] || "./out");
const BEFORE = process.env.BEFORE_ORIGIN || "http://127.0.0.1:3101";
const AFTER = process.env.AFTER_ORIGIN || "http://127.0.0.1:3102";
const WIDTHS = (process.env.WIDTHS || "390,768,1024,1440,1920").split(",").map(Number);

const ROUTES = (process.env.ROUTES || [
  "/",
  "/music",
  "/music/shadows-of-a-ghost-town",
  "/music/songs-from-the-sofa",
  "/epk",
  "/media",
  "/poetry",
  "/fyc/shadows-of-a-ghost-town",
  "/fyc/kindred-spirits",
  "/booking",
  "/shows",
  "/shop",
  "/megs-playbook",
].join(",")).split(",");

/**
 * Head fields that decide how a page is indexed and shared.
 *
 * These are passed to page.evaluate as FUNCTIONS, never as strings. Given a
 * string, evaluate treats it as an expression: "() => …" evaluates to a
 * function object, which serialises to undefined — so every side returns
 * undefined and every comparison passes. A check that cannot fail is worse
 * than no check, because it is reported as a pass.
 */
const META = () => {
  const g = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;
  const all = (sel, attr) => [...document.querySelectorAll(sel)].map((e) => e.getAttribute(attr));
  return {
    title: document.title,
    description: g('meta[name="description"]', "content"),
    canonical: g('link[rel="canonical"]', "href"),
    robots: g('meta[name="robots"]', "content"),
    ogTitle: g('meta[property="og:title"]', "content"),
    ogDescription: g('meta[property="og:description"]', "content"),
    ogUrl: g('meta[property="og:url"]', "content"),
    ogImage: all('meta[property="og:image"]', "content"),
    ogType: g('meta[property="og:type"]', "content"),
    twitterCard: g('meta[name="twitter:card"]', "content"),
    ldjson: [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => x.textContent.trim()),
  };
};

/** Visible text, whitespace-normalised. */
const TEXT = () => document.body.innerText.replace(/\s+/g, " ").trim();

/** Every link and image the page points at — a silent href change is a bug. */
const LINKS = () => ({
  links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
  images: [...document.querySelectorAll("img")].map((i) => i.getAttribute("src")),
});

async function settle(page) {
  // Motion is real on these pages. Freeze it so a screenshot is deterministic:
  // the parity question is what the page renders, not where an ease is at t.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;
      transition-duration:0s!important;transition-delay:0s!important;
      animation-iteration-count:1!important;scroll-behavior:auto!important}`,
  });
  // Walk the page so every lazy image and scroll-triggered reveal fires. A
  // single jump to the bottom skips the ones in between.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  // Cap the image wait: an image still outside the viewport never fires
  // onload, and an unbounded Promise.all on `complete` hangs forever.
  await page.evaluate(async () => {
    const pending = [...document.images].filter((i) => !i.complete);
    await Promise.race([
      Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
  });
  await page.waitForTimeout(200);
}

async function capture(context, origin, route, width, file) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 900 });
  const res = await page.goto(origin + route, { waitUntil: "load", timeout: 45000 });
  const status = res?.status() ?? 0;
  await settle(page);
  // Learning #142: size the viewport to the page and take one shot, rather
  // than stitching scrolled tiles that double sticky headers.
  const h = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  await page.setViewportSize({ width, height: Math.min(Math.ceil(h), 16000) });
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, fullPage: true });
  const meta = await page.evaluate(META);
  const text = await page.evaluate(TEXT);
  const refs = await page.evaluate(LINKS);
  await page.close();
  // A probe that returns nothing compares equal to the other side's nothing
  // and reports a pass. Make that unrepresentable rather than documented.
  if (typeof text !== "string" || text.length === 0) throw new Error(`text probe returned nothing for ${origin}${route}`);
  if (!meta || typeof meta.title !== "string" || !meta.title) throw new Error(`meta probe returned nothing for ${origin}${route}`);
  if (!refs || !Array.isArray(refs.links)) throw new Error(`links probe returned nothing for ${origin}${route}`);
  return { status, meta, text, refs, height: h };
}

/** Per-pixel difference count, plus a red-marked diff image when they differ. */
async function pixelDiff(aPath, bPath, diffPath) {
  const [a, b] = await Promise.all([
    sharp(aPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(bPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { sizeMismatch: true, a: `${a.info.width}x${a.info.height}`, b: `${b.info.width}x${b.info.height}`, diffPixels: null };
  }
  const { width, height } = a.info;
  const out = Buffer.alloc(width * height * 4);
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 12) {
      diff++;
      out[i] = 255; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 255;
    } else {
      // Ghost the unchanged page so a diff image is readable on its own.
      const v = 255 - Math.round((255 - a.data[i]) * 0.15);
      out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
    }
  }
  if (diff > 0) await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(diffPath);
  return { sizeMismatch: false, diffPixels: diff, total: width * height, width, height };
}

const results = [];
const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: "no-preference" });

for (const route of ROUTES) {
  const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
  for (const width of WIDTHS) {
    const dir = path.join(OUT, "shots", slug);
    fs.mkdirSync(dir, { recursive: true });
    const aFile = path.join(dir, `${width}-before.png`);
    const bFile = path.join(dir, `${width}-after.png`);
    const dFile = path.join(dir, `${width}-diff.png`);
    let a, b, px;
    try {
      a = await capture(context, BEFORE, route, width, aFile);
      b = await capture(context, AFTER, route, width, bFile);
      px = await pixelDiff(aFile, bFile, dFile);
    } catch (err) {
      results.push({ route, width, error: String(err).slice(0, 300) });
      console.log(`ERR  ${route} @${width}  ${String(err).slice(0, 120)}`);
      continue;
    }
    const textSame = a.text === b.text;
    const metaSame = JSON.stringify(a.meta) === JSON.stringify(b.meta);
    const refsSame = JSON.stringify(a.refs) === JSON.stringify(b.refs);
    results.push({
      route, width,
      status: { before: a.status, after: b.status },
      height: { before: a.height, after: b.height },
      pixels: px,
      textSame, metaSame, refsSame,
      text: textSame ? undefined : { before: a.text, after: b.text },
      meta: metaSame ? undefined : { before: a.meta, after: b.meta },
      refs: refsSame ? undefined : { before: a.refs, after: b.refs },
    });
    const verdict = px.sizeMismatch ? `SIZE ${px.a} vs ${px.b}` : `${px.diffPixels} px`;
    process.stdout.write("");
    console.log(
      `${textSame && metaSame && refsSame && !px.sizeMismatch && px.diffPixels === 0 ? "OK  " : "DIFF"}` +
      ` ${route} @${width}  ${verdict}  text=${textSame} meta=${metaSame} refs=${refsSame}`,
    );
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, "parity.json"), JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.error || !r.textSame || !r.metaSame || !r.refsSame || r.pixels?.sizeMismatch || r.pixels?.diffPixels > 0);
console.log(`\n${results.length} pairs, ${bad.length} with a difference`);
process.exit(0);
