# Phase 0 — Parity on `/` with the zone mounted and empty

Standard (contract §2): rendered text, head metadata and refs byte-identical on Home; pixels within the noise floor. Servers: local production builds of `main` (port 3101) and the Phase 0 branch (port 3102), same WordPress reads.

**Noise floor** (3102 vs 3102, five widths): `/` @390 1,025 px, @1440 5 px with text/refs flagged (the live shows and release-cover images arriving at different moments), the other three 0.

**Real run** (`parity.json`): text identical on 5 of 5 (the @1440 "difference" is whitespace only — the word diff is empty), head metadata identical on 5 of 5, links identical on 5 of 5, images identical on 4 of 5 (@1440: two release covers absent on one side, the floor's own class). Pixels: @390 3,067 px, @768 2 px, else 0 — the floor's class on Home.

**Document diff.** The two HTML documents, split on tag boundaries with the build id, static chunk paths and nonces masked: 1,069 lines each, **44 differ**, and every one of them is a React `useId` value (`_R_35flb_` → `_R_3lflb_`) on the mailing-list form's labels and inputs, or the RSC payload line carrying the same ids. Masking the id makes every non-payload line pair up exactly. Cause: `HomeBlocks` is a new node in the tree before `Newsletter`, so React's id counter moves one position. Label-for and `aria-describedby` still match their inputs on both sides. Fetching the same server twice differs by 0 lines, so the measurement is exact. Not byte-identical, then, but identical in every rendered, read or linked thing — recorded as such rather than claimed as bytes.

`HomeBlocks` returns `null` while `HOME_CONTENT.blocks` is `[]`; the string "What's new" (its section label once blocks exist) appears 0 times in the built page.
