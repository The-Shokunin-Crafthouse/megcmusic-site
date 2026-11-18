# Phase 2.2 — Reduced motion

**Sprint:** 14 · **Date:** 2026-11-18 · **Runner:** session (Playwright, `reducedMotion: 'reduce'`, live `megcmusic.com`)

**What this is.** The browser's `prefers-reduced-motion: reduce` media feature, emulated per context. It is the same signal the OS setting drives, and it exercises the CSS and JS paths that read it. It is **not** a toggle of macOS "Reduce motion" with a person watching the home scroll scene. That walk stays Levi's (see Waiting on Levi).

**Method.** For `/`, `/shop`, `/shows`, `/media`, `/booking`, `/epk` at 1440 and 390, in Chromium and WebKit: load, wait 3.5 s, scroll to mid-page, wait 1.2 s, then read `document.getAnimations()` for running animations and count `main h1, h2, p` that are visible versus at opacity under 0.05.

| Check | Normal motion | Reduced motion |
|---|---|---|
| Running animations, `/` | 4–5 (`logo-shimmer`, `nav-edge-pan`, three Instagram parallax) | **0** on every route, both engines, both widths |
| Running animations, other routes | 1–2 (`logo-shimmer`, `nav-edge-pan`) | **0** |
| Text at opacity under 0.05 | 0 | **0** on every route |
| Broken images, horizontal overflow | 0 | 0 |

**Result: PASS on the emulated signal.** Every animated surface that was running under normal motion is stopped under reduce, and no content is left hidden waiting for an animation that will not play: the failure the contract names ("a blank page") does not occur. This covers the shimmer, the nav pan and the Instagram parallax. The shop spinner no longer shows on a built `/shop` (PR #184), and the video facade and section reveals were not separately exercised: no route carried a running animation or a hidden text node under reduce, which is the check that would catch them, but I did not watch them.

**Observed, not chased.** In the reduced-motion runs a resource returned **401 Unauthorized** on `/`, `/epk` and (WebKit) once at 390. It did not appear in the normal-motion runs, so it is triggered by the scroll, probably a lazy asset. Source not identified; no visible effect. Also one Next prefetch request per product link on `/shop` shows as `requestfailed`; the endpoint answers 200 when asked directly, so I take it as a navigation abort and not a defect.
