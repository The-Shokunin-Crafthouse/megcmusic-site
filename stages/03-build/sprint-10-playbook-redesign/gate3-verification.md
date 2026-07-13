# Gate-3 Verification — /megs-playbook PWA redesign — 2026-07-12

Overall: **FAIL** (three items are not verifiable in this environment and stay open until the preview URL / real devices; every locally-verifiable line passes)

## Design quality

- **Motion: PASS** — all values from the sprint §7 table via `motion/springs.ts` (120/220/450ms, springs k400 on affordances/sheets/stack, nothing >450ms); every primitive carries a `useReducedMotion` instant-cut path (grep-verified, 6/6 primitives); tap affordance is the studio spring (learning #17), sheets per learning #16. Caveat: animation *completion* could not be watched in the sandboxed browser pane (its rAF never ticks — environment, not product); Playwright asserts panels settle and transitions run.
- **Typography: PASS with logged deviation** — scale is the comp's own (12/14/16/20/24/30px + 6px ★ glyph + 171px watermark), tokenized as `--pb-text-*`; it is not a single modular ratio, but Figma is the client-signed spec and comp fidelity governs (repo learning 2026-06-16, tokenize-don't-snap). Faces are the existing Google-Fonts `<link>` (`display=swap`) — self-host remains the standing Gate-3 deferral logged 2026-06-16.
- **Color: PASS** — every color a `--pb-*` token; zero raw hex in component CSS (grep; the two comment-only mentions document token gaps); dark-only is this surface's designed mode (private tool, comp is dark; no light variant by design — formally noted). Four comp text colors measured sub-AA and were lifted along-hue to ≥4.5:1 (ADR 2026-07-12; originals recorded in the extraction spec).
- **Spacing: PASS** — 24/16/8/4 token scale (`--pb-space-*`), on the 4/8pt grid; remaining raw px in CSS are borders (1–2px), the focus ring, and comp-exact component dimensions carried as tokens.
- **Interaction: PASS** — five states centralized in the shared `TapScale` pressable (default/hover/active/disabled/focus-visible) consumed by all pressables; chips and checklist rows carry their own hover/active pair (added this pass); `aria-disabled` pattern on link-shaped controls; focus ring is the dedicated `--pb-focus-ring` (13:1 / 11:1 on the two grounds).
- **Responsive: PASS for this surface's contract** — brief scopes 390/768 (mobile-first; desktop = centered 430px shell, not a redesign). Verified in-browser at 390 and 768; 1024+ renders the same fixed-width column by construction. Touch targets ≥44px (`--mc-touch-target` min-heights + hit-slop on the 40px nav circles).
- **Anti-defaults: PASS** — no hamburger, no progress bars (text "N of M"/"N of 7"), no bare spinners (staged narrative + skeletons), no unstyled focus. Pill badges/filter chips/text gradient are comp-specified client design, not template defaults.

## Gate 3

- **Core Web Vitals: NOT VERIFIABLE HERE** — no production-like measurement run (dev server only; the CI preview URL is where LCP/CLS/INP get measured — action for review). CLS guards are designed in (skeleton-shaped loading, below-fold defer via first-paint-priority sections).
- **Keyboard: PASS (automated scope)** — every control is a real button/checkbox/radiogroup with `:focus-visible` rings; sheets/take-overs trap focus and return it rAF-deferred (learning #64); Playwright asserts the ring token. Full manual walk on-device still recommended.
- **Screen reader: PARTIAL / NOT VERIFIABLE HERE** — name/role/state wired (`role="checkbox"`/`aria-checked`, radiogroup titles, `aria-expanded` disclosures, `aria-live` on async status, `aria-current` nav) but no VoiceOver session was run — needs a real iOS device.
- **Contrast: PASS** — computed against both grounds and the worst-case card composite: body 14.86:1, stat 6.66, teal 7.02, lifted muted 4.57, red text 4.58, wtw 4.55, card-text 4.56, success 7.69, ink-on-teal 6.86, ink-on-cream 14.15. Decorative ★/slash separators accepted sub-AA (ADR).
- **Reduced motion: PASS** — implemented in every primitive + GenerationWait; Playwright runs a `reducedMotion: 'reduce'` functional pass.
- **Cross-browser: NOT VERIFIABLE HERE** — Chromium only in this environment. Safari iOS (the actual target device), Firefox, desktop Safari need the preview URL. iOS-specific risks flagged for that pass: Web Speech API availability in standalone mode (feature-detected, mic hides), `backdrop-filter` cost, SW install flow.

## Blocking failures

1. CWV measurement — owner: Levi, on the CI preview URL (Lighthouse mobile).
2. Cross-browser/device pass (Safari iOS installed-PWA walk) — owner: Levi + Meghan's phone.
3. VoiceOver spot-check on the four tabs + creation flow — owner: Levi.

## Not verifiable here

The three blocking items above, plus: real daemon round-trip (migration unapplied — go-live step), animation feel at 60fps (rAF-frozen sandbox), true iOS safe-area behavior (simulated only).
