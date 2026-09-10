# Phase 3 — Parity for the VideoFacade extraction, then the video block

Standard (contract §2 and §6): Home and Media identical after the extraction alone; then, with a block of the phase's type, the only difference is that block. Servers: local production build of `main` at a25f077 (port 3101, worktree with `.env.local` copied in — the Phase 2 lesson) and this branch (port 3102). Scripts in `scripts/`.

## 1. Extraction alone — `extract-noise/`, `extract/`

The gallery's featured tile — 16:9 box, thumbnail and play button, the `youtube-nocookie` iframe once played — moved verbatim into `src/components/VideoFacade`; `VideosGallery` re-mounts it controlled (`playing` / `onPlay`) so its playlist still swaps the active video, and keeps only the grid slot's own `min-width` rule. `scripts/parity/parity.mjs`, `/` and `/media`, five widths.

Noise floor (3102 vs 3102): pixels 2,502 @ `/` 390, 0 on the other nine pairs; text, meta, refs identical 10/10. Real run (`extract/parity.json`): pixels **1,068 @ `/` 390, 0 on the other nine; text, meta, refs identical 10/10.**

**Document diff** (build id, chunk paths, nonces, module hashes masked; the same server twice differs by 0): on `/` and on `/media`, **4 rendered lines** each — the box, button, image and play glyph, whose class names now read `VideoFacade-module__…` (the box also keeps the gallery's slot class) — plus the payload lines carrying them. Nothing else.

## 2. Zone with video blocks — `zone-proof-*.json`, `shots/real/`, `video-states.json`

Test rows injected into the after build's snapshot as in Phases 1–2 (nothing written to WordPress): (1) a watch URL with a caption, (2) a Shorts URL with none, (3) a Vimeo link — not a YouTube id, so the parser drops it (a missing required field drops silently by design; only an unknown layout logs). Rendered: both facades with the oEmbed titles in their play buttons ("Play Copper & Quartz live at Society Hall", "Play September 1, 2025"), one caption, 0 occurrences of the dropped row's caption.

**A first run was polluted, and is not the record** (`stale-snapshot-run/`). After the extraction build I had restored `src/generated` to the committed snapshot before injecting, so the after side was built on stale content — Liner Notes had lost the recognition rows Meg added since the snapshot, and the hero manifest differed — while the before worktree's prebuild had fetched live. Above the zone differed by six figures and the page came out shorter at 390:

| width | page delta | above differing |
|---|---|---|
| 390 | -174 | 108,170 |
| 768 | 1014 | 263,198 |
| 1024 | 710 | 221,147 |
| 1440 | 791 | 312,217 |
| 1920 | 791 | 312,217 |

Cured by the order fetch → inject → `npx next build`, so both sides carry the same live content (`npm run build` cannot be used after injecting: its prebuild overwrites the rows). Repo lesson for `sc-learn`, with Phase 2's: a parity side is built from a fresh fetch, never from the committed snapshot.

Method as Phases 1–2 (`scripts/zone-proof.mjs`, `VH_CAP=5000`, TOL 40, ±1-row recount). Noise floor: 0 above, 0 below, five widths.

| width | zone height | page grew by | above: differing / compared | below: aligned → ±1 row / compared |
|---|---|---|---|---|
| 390 | 676.25 | 676 | 0 / 3,654,300 | 46,177 → 0 / 2,117,700 |
| 768 | 1151.50 | 1151 | 0 / 6,098,688 | 20,219 → 19 / 3,158,784 |
| 1024 | 1439.50 | 1439 | 0 / 8,197,120 | 17,556 → 8 / 4,113,408 |
| 1440 | 1520.50 | 1520 | 0 / 11,651,040 | 23,722 → 0 / 6,063,840 |
| 1920 | 1520.50 | 1520 | 0 / 15,534,720 | 23,724 → 0 / 8,085,120 |

Reduced motion (390, 1440):

| width | above | below ±1 row |
|---|---|---|
| 390 | 0 | 0 |
| 1440 | 0 | 0 |

The page grows by exactly the zone's height; nothing above moves; the below residue clears to 0 / 19 / 8 / 0 / 0 — the same seam residue as Phases 1 and 2.

**The block against the spec** (`scripts/video-states.mjs` at 1440, normal and reduced motion; spec in `_config/design-system/a11y-spec.md`):

- **Names.** Play buttons named "Play {oEmbed title}"; thumbnails `alt=""`; the gallery's own facade now carries the same `VideoFacade` classes. Boxes 1000 px wide at 16:9 (1.778).
- **Tab order.** Instagram handle → "Play Copper & Quartz live at Society Hall" → "Play September 1, 2025" → EPK "View" → the gallery's play button. Two focusables in the zone, one per video.
- **Five states** on the first play button:

| state | outline | play glyph | thumbnail | reduced motion |
|---|---|---|---|---|
| default | none | 1.0 | 1.0 | transitions 0s |
| hover | none | 1.08 | 1.03 | same scales, transition 0s (the gallery's existing reduced-motion contract: transitions off, hover geometry kept) |
| focus-visible (keyboard) | `solid 3px rgb(96, 177, 173)`, offset −3px | 1.0 | 1.0 | same ring |
| active (pressed) | none | **0.96 — new this phase**, shared with the gallery (cascade, learning #19) | 1.03 | same |
| disabled | not applicable — an invalid link renders no block (parser rule) | | | |

- **After the click**: the button is gone, one `iframe` (`youtube-nocookie.com/embed/A8E_XRwkhTk?autoplay=1&rel=0`) titled with the video's name; one iframe on the page.

## 3. Drift check

`sc-hygiene` `drift_check` since `origin/main`: 14 gating findings. Twelve are `var(--mc-…)` references with a hue word in the token name (the known false positive; all pre-existing gallery lines). **Two are real literals, both pre-existing on `main` (Videos.module.css lines 32 and 65) and moved verbatim into `VideoFacade.module.css`:** `border: 3px solid #000` and `filter: drop-shadow(0 4px 12px rgb(0 0 0 / 0.5))`. Not tokenised here — the extraction's standard is identical output, and a new token needs its own logged decision (contract §2). Flagged as a follow-up task ("Tokenise the video facade's black border and drop-shadow"), with the playlist's second drop-shadow.

## 4. Not verified here

The destination path — Phase 4, Levi as Meg, timed. Real screen reader on a real device — Gate 3's line.
