# Phase 2 — Parity on `/` for the PullQuote extraction, then the pull-quote block

Standard (contract §2 and §5): Home identical after the extraction alone, before the block uses the shared component; then, with a block of the phase's type, the only difference is that block. Servers: local production build of `main` at 056a2f8 (port 3101) and this branch (port 3102). Scripts in `scripts/` (learning #52).

## 1. Extraction alone — `extract-noise/`, `extract/`

`LinerNotes`' blockquote and its three CSS rules moved verbatim into `src/components/PullQuote`; LinerNotes re-mounts it with `oneLineFromTablet` so its one-line desktop rule (2026-07-10) stays. `scripts/parity/parity.mjs`, `/` at five widths.

Noise floor (3102 vs 3102): pixels 1,030 @390, 0 at the other four; text, meta, refs identical 5/5. Real run (3101 vs 3102, `extract/parity.json`): pixels **6 @390, 0 at the other four; text, meta, refs identical 5/5.**

**Document diff.** Both HTML documents split on tag boundaries with build id, chunk paths, nonces and CSS-module hashes masked: 1,069 lines each; the same server twice differs by 0. Before vs after: **3 rendered lines** — the blockquote, its `p` and its `cite`, whose class names now read `PullQuote-module__…` (the `p` also carries `oneLine`) — plus the 2 payload lines carrying the same class strings. Nothing else.

**A first run was polluted, and is not the record.** The before worktree was built without `.env.local`, so `NEXT_PUBLIC_BEHOLD_FEED_ID` was unset at build (learning #95) and its Instagram section rendered the follow-link fallback instead of the four-post grid: 41 differing lines, all Instagram. Rebuilt with the file copied in; the numbers above are that run. Phase 1's proof was not affected (both of its sides were worktrees without the file, and both showed the fallback — a matched pair). Repo lesson for `sc-learn`: a parity worktree copies `.env.local` before it builds.

## 2. Zone with pull-quote blocks — `zone-proof-*.json`, `shots/real/`, `quote-check.json`

Test rows injected into the after build's `home.json` snapshot as in Phase 1 (nothing written to WordPress): (1) a long quote with an attribution, (2) a short quote with none, (3) a blank quote with an attribution — dropped by the parser. Built with `npx next build`: the first attempt used `npm run build`, whose prebuild fetch re-pulled live page 4 and overwrote the injected rows (and dragged upstream drift into `page-hero.json` and `videos.json`, restored with `git checkout` before committing — learning #69). Rendered: both quotes, "What's New", 0 occurrences of the dropped row's attribution.

Method as Phase 1 (`scripts/zone-proof.mjs`, `VH_CAP=5000`, TOL 40, ±1-row recount). Noise floor: 0 above, 0 below, five widths.

| width | zone height | page grew by | above: differing / compared | below: aligned → ±1 row / compared |
|---|---|---|---|---|
| 390 | 523.50 | 524 | 0 / 3,654,300 | 28,872 → 0 / 2,118,090 |
| 768 | 579.50 | 579 | 0 / 6,098,688 | 20,219 → 19 / 3,158,784 |
| 1024 | 555.50 | 555 | 0 / 8,197,120 | 17,556 → 8 / 4,113,408 |
| 1440 | 555.50 | 555 | 0 / 11,651,040 | 23,722 → 0 / 6,063,840 |
| 1920 | 555.50 | 555 | 0 / 15,534,720 | 23,724 → 0 / 8,085,120 |

Reduced motion (390, 1440):

| width | above | below ±1 row |
|---|---|---|
| 390 | 0 | 0 |
| 1440 | 0 | 0 |

The page grows by exactly the zone's height; nothing above moves; the below residue is the half-pixel zone height (x.50) and the recount clears it to 0 / 19 / 8 / 0 / 0 — the same two widths and counts as Phase 1's announcement, so it is the seam's own residue, not the block's.

**The block against the spec** (`scripts/quote-check.mjs` at 1440, `quote-check.json`; spec in `_config/design-system/a11y-spec.md`): zone name "What's New"; **0 focusable elements in the zone** (nothing interactive, no tab stop added, no five-state walk to run); each block a native `blockquote` with the same class as the LinerNotes one; `cite` present on the attributed quote and absent on the other; computed panel identical to LinerNotes' (`--mc-bg-quote`, 3 px pink rule, 24 px bottom-right radius, 24/32 padding; Lora italic 20/24) with `white-space: normal` in the zone and `nowrap` in LinerNotes. The dropped row: not rendered.

## 3. Drift check

`sc-hygiene` `drift_check` since `origin/main`: six gating "raw colour" findings — `LinerNotes.module.css` 72/102/113/125 (pre-existing lines in a file that changed) and `PullQuote.module.css` 7/39. Every one is a `var(--mc-…)` reference whose token name carries a hue word; the checker's known false positive (LEARNINGS 2026-09-06). No literal colour in the new stylesheet.

## 4. Not verified here

The destination path — Phase 4, Levi as Meg, timed. Real screen reader on a real device — Gate 3's line.
