# Gate-3 Verification — /megs-playbook PWA redesign

**Originally written 2026-07-12 (verdict FAIL). Re-verified 2026-07-28 against a production build.**

Overall: **FAIL** — one blocking line (LCP) and three lines that need hardware this session could not reach. Everything else now passes on measured evidence rather than on inspection.

What changed since the 2026-07-12 pass: Core Web Vitals were measured for the first time (the line previously read "NOT VERIFIABLE HERE"). That measurement found a real CLS failure, which is fixed in PR #67, and a real LCP failure, which is architectural and unfixed. A WebKit engine pass and an automated WCAG audit replaced two lines that were previously unverified.

## How the 2026-07-28 measurements were taken

`npm run build` + `next start` on the merged main tree, driven three ways:

- **Lighthouse 13.4.1**, mobile form factor, simulated throttling, `performance` + `accessibility` categories.
- **Playwright Chromium**, iPhone 13 descriptor, CDP network emulation (150ms RTT / 1.6 Mbps) + 4× CPU throttle, with `largest-contentful-paint` and `layout-shift` PerformanceObservers.
- **Playwright WebKit**, iPhone 13 descriptor — the same engine family as Safari iOS, not the same runtime.

Plus **real iOS Safari on a booted iPhone 17 simulator (iOS 26.5)** for rendering, via `xcrun simctl`. The simulator MCP could not be used (`Xcode is installed but not selected` — needs `sudo xcode-select`, which requires Levi's password), so the simulator was driven from the CLI: it can open URLs and capture screenshots but **cannot tap**, which bounds what the iOS line below could cover.

## Design quality

- **Motion: PASS** — unchanged from 2026-07-12. All values from the sprint §7 table via `motion/springs.ts`; every primitive carries a `useReducedMotion` instant-cut path (6/6, grep-verified); tap affordance is the studio spring (learning #17), sheets per learning #16. Playwright's `reducedMotion: 'reduce'` functional pass still passes (16/16 suite green on 2026-07-28).
- **Typography: PASS with logged deviation** — unchanged. Scale is the comp's own (12/14/16/20/24/30px + 6px ★ glyph + 171px watermark) tokenized as `--pb-text-*`; not a single modular ratio, but Figma is the client-signed spec and comp fidelity governs. Faces remain the Google-Fonts `<link>` (`display=swap`); self-host is still the standing Gate-3 deferral logged 2026-06-16.
- **Color: PASS** — unchanged. Every color a `--pb-*` token, zero raw hex in component CSS; dark-only by design on this surface. The four sub-AA comp values stay lifted along-hue (ADR 2026-07-12).
- **Spacing: PASS** — unchanged. 24/16/8/4 `--pb-space-*` scale on the 4/8pt grid.
- **Interaction: PASS** — unchanged. Five states centralized in the shared `TapScale` pressable; `aria-disabled` on link-shaped controls; focus ring is the dedicated `--pb-focus-ring` (13:1 / 11:1).
- **Responsive: PASS for this surface's contract** — unchanged. Brief scopes 390/768; desktop is a centered 430px shell by construction. Touch targets ≥44px via hit-slop, hit-tested rather than box-measured (learning #112).
- **Anti-defaults: PASS** — unchanged.

## Gate 3

- **Core Web Vitals: FAIL** — measured, production build, mobile:

  | Metric | Measured (before PR #67) | Measured (with PR #67) | Budget | Verdict |
  |---|---|---|---|---|
  | LCP | 6.8s | 6.8s | < 2.5s | **FAIL** |
  | CLS | 0.394 (Lighthouse) / 0.326 (Playwright) | **0** / **0** | < 0.1 | PASS with #67 |
  | INP (TBT proxy) | 20ms | 20ms | < 200ms | PASS |
  | Lighthouse performance score | 53 | 74 | — | — |

  **CLS root cause and fix.** All of it came from the Home screen: every block there is sized by data still in flight at first paint, and the in-flow shaped skeletons stood in well short of their content's real height (Next Post: a 150px placeholder for a ~490px section). When the three queries resolved together at ~3.8s the column re-flowed at once — one 0.27 shift across Last Post + Weekly, then a 0.06 correction on Next Post. PR #67 renders the boot column out of flow so the real column mounts at its final position (learning #54); measured 0.

  **LCP root cause, unfixed.** `/megs-playbook` server-renders only a shell — every screen is `"use client"` — so the LCP element (the Next Post section) cannot paint until the JS bundle hydrates and three API round trips complete. Measured: FCP 612ms, DOM interactive 610ms, **first API request starts at 3557ms**. This is an architecture change to a shipped surface, so it is surfaced rather than absorbed. Candidates, ascending cost: (1) dehydrate the recommendation + daily-insight queries into the server HTML — the recommendation is already derived server-side with no external dependency, so this is the cheapest real win; (2) `<link rel="preload" as="fetch">` the three Home endpoints so they start with the document; (3) trim critical-path JS on the Home route.

- **Keyboard: PASS (automated scope)** — unchanged from 2026-07-12 and re-run green. Every control is a real button/checkbox/radiogroup with `:focus-visible` rings; sheets and take-overs trap focus and return it rAF-deferred (learning #64). A manual walk on a physical device is still the last mile.
- **Screen reader: PARTIAL** — automated WCAG 2.0/2.1 A+AA audit (axe-core) run on the production build across **all four tabs and the idea-entry screen: 0 violations on each**; Lighthouse accessibility 100. Name/role/state are wired as designed. **A real VoiceOver session was still not run** — VoiceOver cannot be driven from this session (it needs macOS Automation grants that require an interactive approval), so the line stays PARTIAL. axe catches machine-checkable failures; it does not tell you whether the four tabs and the creation flow *announce sensibly*.
- **Contrast: PASS** — unchanged, plus Lighthouse's own contrast audits clean at 100.
- **Reduced motion: PASS** — unchanged; Playwright reduced-motion functional pass green.
- **Cross-browser: PARTIAL** — Chromium and **WebKit** now both pass: all four tabs render, zero page errors in WebKit, and the Web-Speech mic appears on the idea-entry screen where the API exists (feature detection behaves). Real iOS Safari was exercised on the iPhone 17 simulator for **rendering only**: the first-run screen paints correctly, the "Put it on your home screen" card reads right, and the top safe-area inset is respected under the Dynamic Island. Firefox and desktop Safari were not run. **The installed-PWA walk on a physical iPhone is still outstanding** — see below.

## Verified live in production

- **The 2026-07-22 device-test fixes are in the shipped tree** — all four confirmed present on `main`: take-over fills by flex (`TakeoverModal.module.css` + `StackNavigator.module.css`), exit-confirm on `--pb-bg-sheet-takeover`, `.radioRow` UA-chrome reset in `BookingScreen.module.css`, and the shared `PostThumbnail` degrade component consumed by Home and Stats. **They were not live on megcmusic.com when this pass began** — see the deploy failure below — and go live with PR #66.
- **Tips seed: PASS** — run against the live Supabase project (`lydxxqrhmlubanneepyl`) on 2026-07-28 and verified at the destination: 210 `source='seed'` rows (daily_insight 52 / why_this_works 42 / stat_insight 42 / booking_insight 42 / checklist 32), 213 total including the 3 pre-existing `post_derived` rows. Before this run the table held only those 3.
- **Generation daemon round-trip: PASS** — a real `questions` job inserted into production `generation_jobs` was claimed by the LaunchAgent on Meghan's Mac, moved `queued → streaming → done` with no error, and the probe row was deleted afterward. This closes the "real daemon round-trip" item the 2026-07-12 pass listed as not verifiable.

## Blocking failures

1. **LCP 6.8s vs a 2.5s budget** — owner: Levi (scope call on which of the three candidate fixes to take). This is the one line that fails on evidence rather than on missing hardware.

## Still not verifiable from this session

These need hardware or an interactive session; none of them were performed, and none should be recorded as passing.

1. **Installed-PWA walk on a physical iPhone** — install from Safari to the home screen (Chrome iOS cannot install a PWA), confirm standalone display mode, confirm the dictation mic appears and hides correctly under a real Web Speech implementation, and confirm safe-area insets notch-to-notch. Needs: Meghan's phone. The simulator gave rendering only — `xcrun simctl` cannot tap, and the simulator MCP is blocked on `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. **VoiceOver spot-check** — four tabs plus the full creation flow. Needs: an interactive macOS or iOS session with Automation permission.
3. **Daemon reboot survival** — the LaunchAgent auto-starting after a real reboot and claiming a job, verified by runtime artifacts (learning #87). Needs: physical or remote access to Meghan's Mac. The daemon is confirmed *running and working* today (see the round-trip above); what is unverified is specifically its behaviour across a restart.
4. **Firefox and desktop Safari** — not run this session.
