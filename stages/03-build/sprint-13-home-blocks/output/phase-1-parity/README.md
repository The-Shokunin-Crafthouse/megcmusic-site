# Phase 1 — Parity on `/` with the announcement block

Standard (contract §2, Phases 1–3): with the zone empty, Home identical; with a block of the phase's type, the only difference is that block — region proof as in Sprint 12 Phase A. Servers: local production builds of `main` at 9889cd0 (Phase 0, port 3101) and this branch (port 3102), same WordPress reads. Scripts in `scripts/` (learning #52).

## 1. Zone empty — `empty-noise/`, `empty/`

`scripts/parity/parity.mjs`, `/` at five widths. Noise floor (3102 vs 3102): pixels 25 @390, 0 at the other four; text, meta, refs identical 5/5. Real run (3101 vs 3102): pixels 162 @390, 0 at the other four; **text, meta, refs identical 5/5.** (Phase 0's floor at 390 was 1,025 px; the WebGL atmosphere's own variance.)

**Document diff.** Both HTML documents split on tag boundaries with build id, chunk paths and nonces masked: 1,070 lines each. Every line outside the RSC payload is identical — including the `useId` values Phase 0 moved, since both sides now carry the `HomeBlocks` node. Inside the payload 10 lines differ: the build id string, the RSC row numbers (one more module reference shifts them by one), and the row boundaries of the streamed chunks. Nothing rendered, read or linked. "What's New" appears 0 times in the built page.

## 2. Zone with blocks — `zone-proof-*.json`, `shots/real/`

**How the block got there — a deviation from the contract line.** §4 says one announcement saved by the session on WP page 4 through a new `set-acf` op. Not done: a test block on live Home is visible to every visitor for as long as it exists, and the destination proof (save in the dashboard → live on megcmusic.com, timed) is already Phase 4's, run by Levi as Meg. Instead `scripts/inject-blocks.mjs` wrote three rows into the after build's `src/generated/wp-content/home.json` snapshot — the same bytes `fetch-wp-content.mjs` would write from REST — and the after side was rebuilt. Nothing was written to WordPress. Logged in the ADR.

Rows: (1) announcement with eyebrow, headline, body and an external link; (2) announcement with headline, body and a same-site link (`/epk`); (3) layout `poster`, unknown. The build logged `home_blocks: row 3 has unknown layout "poster" — rendering nothing for it` (nine times — once per worker that evaluates the module; one build, one snapshot) and the row's text appears 0 times in the page.

**Method.** `scripts/zone-proof.mjs`: before has no zone, so its seam is the Instagram section's bottom edge; after's region is `section[aria-labelledby="home-blocks-heading"]`. Above = every row above the seam on both sides; below = every row after the zone on after against every row after the seam on before. Shared viewport height, 15 s image wait, TOL 40, ±1-row recount for the fractional zone height (797.25 / 759.69 px). **New this phase — `VH_CAP=5000`.** Home carries one `100vh` section, so the page grows 1:1 with the viewport and a viewport sized to the page puts the seam at 15,073 px @390 and the tail past Chromium's 16,384 px capture ceiling at every width (learning #233). The first run (`uncapped/`) shows it: 309,674 px "differing" below the zone @390, all of them rows one side captured and the other could not.

| width | uncapped seam top | below, ±1 row |
|---|---|---|
| 390 | 15073 | 309,674 |
| 768 | 10898 | 19 |
| 1024 | 10930 | 8 |
| 1440 | 11296 | 0 |
| 1920 | 11296 | 0 |

Capped at 5,000, every width's page sits under the ceiling. Noise floor (3102 vs 3102): 0 px above, 0 below, all five widths.

| width | zone height | page grew by | above: differing / compared | below: aligned → ±1 row / compared | noise above / below |
|---|---|---|---|---|---|
| 390 | 797.25 | 797 | 0 / 3,654,300 | 46,175 → 0 / 2,117,700 | 0 / 0 |
| 768 | 759.69 | 759 | 0 / 6,098,688 | 16,353 → 19 / 3,158,784 | 0 / 0 |
| 1024 | 759.69 | 759 | 0 / 8,197,120 | 15,068 → 8 / 4,113,408 | 0 / 0 |
| 1440 | 759.69 | 760 | 0 / 11,651,040 | 8,984 → 0 / 6,065,280 | 0 / 0 |
| 1920 | 759.69 | 760 | 0 / 15,534,720 | 8,984 → 0 / 8,087,040 | 0 / 0 |

The page grows by exactly the zone's height; above the zone nothing moves; below it the aligned count is the sub-pixel residue of a fractional zone height and the ±1-row recount clears it to 0 / 19 / 8 / 0 / 0. Reduced motion (`prefers-reduced-motion: reduce`, 390 and 1440):

| width | above | below ±1 row |
|---|---|---|
| 390 | 0 | 0 |
| 1440 | 0 | 0 |

Crops: `shots/real/<w>-zone-after.png` (the zone) and `<w>-seam-{before,after}.png` (200 px either side of the seam on both builds), five widths.

## 3. The block itself — `block-states.json`

`scripts/block-states.mjs` on the after build at 1440, normal and reduced motion, checked against `_config/design-system/a11y-spec.md`:

- **Names.** Zone: `section[aria-labelledby]` → "What's New" (stars `aria-hidden`). Each `article` is labelled by its own `h3` (ids `_S_1_`, `_S_2_` — server ids, unique). Link 1: "Listen on Spotify, opens in a new tab" — `target=_blank rel="noopener noreferrer"`, visually-hidden suffix, arrow icon. Link 2: "See the press kit" — no target, no suffix, no arrow. Both 44 px tall.
- **Tab order.** Instagram handle link → "Listen on Spotify, opens in a new tab" → "See the press kit" → EPK "View" → the first Videos play button. One stop per announcement, in row order, between Instagram and the press-kit teaser — as specified.
- **Five states** (link 1, computed):

| state | colour | transform | outline | reduced motion |
|---|---|---|---|---|
| default | `rgb(96, 177, 173)` (`--mc-teal-light`) | none | none | same |
| hover | `rgb(124, 198, 193)` (`--mc-teal-bright`) | translateX(3px) | none | colour only, no nudge, transition 0s |
| focus-visible (keyboard) | default colour | none | `solid 2px rgb(96, 177, 173)`, offset 3px | same ring |
| active (pressed) | bright | translateX(3px) | none | colour only |
| disabled | not applicable — a block with no address renders no link (parser rule), so `aria-disabled` never arises (#3) | | | |

- **Motion.** Home has no shared section-reveal component (Instagram's parallax is its own `view()` timeline); the block adds no motion, per §4. Under reduced motion the link's transition is `0s` and the nudge is gone.

## 4. Drift check

`sc-hygiene` `drift_check` reported six gating "raw colour" findings on `Announcement.module.css` (lines 8, 23, 57, 67, 73, 78). Each is `var(--mc-accent-pink)`, `var(--mc-teal-light)` or `var(--mc-teal-bright)` — a token reference whose name carries a hue word; the checker's known false positive (LEARNINGS 2026-09-06). No literal colour, radius or spacing value exists in the new CSS (a grep for hex, `rgb(` and `px` literals across the two new stylesheets finds the 3 px left rule and the 2 px / 3 px focus ring and 15 px icon copied from the Videos channel link, the 1 px visually-hidden box, and the 768 px breakpoint and 1000 px inner measure the neighbouring sections use — no colour literal anywhere).

## 5. Not verified here

The destination path (a block Meg saves → live on megcmusic.com) — Phase 4, Levi as Meg, timed. Real screen reader on a real device — Gate 3's line, not this harness's.
