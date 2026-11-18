# Phase 2.1 — Core Web Vitals, throttled, production

**Sprint:** 14 · **Date:** 2026-11-18 · **Runner:** session (Playwright 1.61.1, Chromium, CDP throttling)
**Budget:** LCP < 2.5 s, CLS < 0.1, INP < 200 ms (WORKSPACE.md §3)
**Target:** live `https://megcmusic.com` (the production build), not the dev server.

**Profiles.** Mobile: Pixel 7 emulation, 4x CPU slowdown, 1.6 Mbps down / 750 kbps up / 150 ms RTT. Desktop: 1440x900, no CPU slowdown, 10 Mbps / 40 ms. Fresh browser context per run, three runs per cell, **median** reported. LCP, CLS and INP come from `PerformanceObserver` in the page (`largest-contentful-paint`, `layout-shift` without recent input, `event` entries with an `interactionId`). INP is driven by a scripted pass: click up to four buttons or nav links, then scroll. It is a lab INP, not field data.

## Live, before any change (2026-11-18)

| Route | Profile | LCP | CLS | INP | LCP element |
|---|---|---|---|---|---|
| `/` | mobile | 1468 ms | 0 | not captured | `logo-name.svg` |
| `/` | desktop | 532 ms | 0 | 48 ms | `logo-name.svg` |
| `/shop` | mobile | **13280 ms — MISS** | 0 | not captured | Photon image, Kindred Spirits cover |
| `/shop` | desktop | **2668 ms — MISS** | 0 | 32 ms | same |
| `/shows` | mobile | 1468 ms | 0.041 | not captured | `logo-name.svg` |
| `/shows` | desktop | 592 ms | 0.002 | 32 ms | `logo-name.svg` |
| `/media` | mobile | 2324 ms (pass, 176 ms of headroom) | 0 | not captured | YouTube thumbnail |
| `/media` | desktop | 800 ms | 0 | 32 ms | YouTube thumbnail |

**Mobile INP is unmeasured.** Under touch emulation no event entry carried an `interactionId`, so the column reads 0 and means nothing. It is not a pass. Desktop INP is 32–48 ms on all four routes.

## What was found on `/shop`

Two causes, both read from evidence:

1. **The product grid was empty in the built HTML.** GitHub holds no `wc/v3` keys, but the build runs `vercel pull`, and the evidence says it saw them anyway: a Store-API-only change built no product page until the snapshot was given precedence over the key path (inferred from that, not from reading the project's env). So the build took the `wc/v3` path, the runner's IP is blocked from it, the read threw, and `/shop` shipped "Loading the shop…". Every visitor then waited on hydration, a cross-origin Store API call, and only then the first image. Live HTML contained the string `Cowgirl Boot Koozie` 0 times. The same empty read left `/shop/[slug]` dynamic (Phase 1.1 defect 4.2). It would also have got worse: with `revalidate = 86400` the Vercel runtime, which cannot reach WordPress, would regenerate the page after a day and cache an empty grid.
2. **Image weight.** Photon returns a PNG source at full weight unless `quality` is set. Network trace at the mobile profile: tiles at `w=1200` weighing 1.46 MB, 1.04 MB and 0.74 MB, ~3.6 MB of PNG in flight at 1.6 Mbps. With `quality=82` the 1.46 MB tile is 84 KB. The 1x/2x `srcset` also fetched 1200 px on every phone.

## After the fix (PR #184), local production build

`next build` + `next start`, same profiles, three runs, median. **This is a proxy**: it is a production build, but not the deployed one, and the LCP images are still fetched from the real Photon CDN. The live re-measure runs after the PR deploys.

| Step | `/shop` mobile LCP | `/shop` desktop LCP |
|---|---|---|
| Live, before | 13280 ms | 2668 ms |
| Products built into the HTML | 11716 ms | 1028 ms |
| + Photon `quality=82` | 4700 ms | 624 ms |
| + sized `srcset`, first row eager at high priority | **1684 ms** | **224 ms** |

CLS on `/shop` after: 0.001 mobile, 0.003 desktop.

## Status

- **PASS (lab, live):** `/`, `/shows`, `/media` on LCP and CLS, desktop INP, all four routes.
- **FIXED, proxy-measured, live re-measure pending:** `/shop` LCP — PR #184, not merged.
- **Not measured:** mobile INP on all routes. Needs a measure that fires real touch interactions with an interaction id, or field data.
- `/media` mobile LCP has 176 ms of headroom. Watch it; do not call it comfortable.
- Mobile `/shows` CLS 0.041 is under budget, from an async-hydrated surface; recorded, not tuned.
