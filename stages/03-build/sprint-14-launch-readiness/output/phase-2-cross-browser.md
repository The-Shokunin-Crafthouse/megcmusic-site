# Phase 2.3 — Cross-browser

**Sprint:** 14 · **Date:** 2026-11-18 · **Runner:** session · **Target:** live `https://megcmusic.com`

Gate 3 names four: Chrome, Firefox, Safari desktop, iOS Safari. **Two of the four were run.** The other two are named misses with an owner, not rounded up.

| Browser | Engine used | Result |
|---|---|---|
| Chrome desktop | Playwright Chromium | **PASS** — six routes × 1440 and 390, status 200, h1 present, no horizontal overflow, 0 broken images, 0 page errors |
| Safari desktop | Playwright WebKit (not Safari.app) | **PASS on the engine** — same six routes × two widths, same checks, identical animation set, no errors. This is the WebKit engine, not the shipping browser; recorded as an engine pass, not as "Safari desktop verified" |
| iOS Safari | iOS 27.0 Simulator, iPhone 17 Pro, real mobile Safari | **PASS on two routes** — `/` renders the hero, the Up Next list and the filter pills; `/shop` renders the header, nav, product tiles with images, prices and the cart button. Not walked: cart drawer, booking form, EPK |
| Firefox | — | **NOT RUN.** Playwright's Firefox build timed out on launch in this environment (macOS sandbox refused the content process: `sandbox_extension_issue_file_to_process failed`), also with the sandbox lifted. Firefox.app is installed on the Mac but this session cannot drive it |

Routes: `/`, `/shop`, `/shows`, `/media`, `/booking`, `/epk`. Per-engine rows are in the run output; the check set is h1 text, `scrollWidth > innerWidth`, images with `complete && naturalWidth === 0`, page errors, console errors, failed requests.

## Open
- **Firefox:** owner Levi. Load `/`, `/shop`, `/shows`, `/booking` at desktop width and one phone width in Firefox, and report anything that looks different from Chrome.
- **Real Safari.app and iOS device:** the engine and simulator passes are strong evidence; they do not replace one look on a real iPhone with the cart drawer opened. Owner Levi, five minutes.
