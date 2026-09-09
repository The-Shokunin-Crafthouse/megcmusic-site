# Phase A — Parity on `/` and `/media`, reviewed and annotated

The tile set is *expected* to change — that is the fix. So this artifact is not "identical"; it is the before/after diff with every difference accounted for. Runner: the building session. Servers: local production builds of `main` (51cff3a, port 3101) and the Phase A branch (7eef080, port 3102), both built from the same live WordPress reads on 2026-09-09.

## 1. Noise floor first (learning #114 in `LEARNINGS.md`, contract §2)

`scripts/parity/parity.mjs` with both origins pointed at port 3102: **10 pairs, 1 difference — `/` @390, 143 px** (the harness measuring itself on a page with live data). `region-proof-noise.json`: **0 differing pixels** above, inside and below the Videos section on all 10 pairs.

## 2. The harness run (`parity.json`)

All 10 pairs differ. Head metadata identical on 10 of 10. Text and refs differ on 10 of 10 — and the whole difference is the four playlist tiles:

| | before (main) | after (Phase A) |
|---|---|---|
| Tiles | `A8E_XRwkhTk` + `AnSq5PmNqd0 GBTHE_ilib4 c7g7f5NsTWU QXPwWRmZlSc` (featured + the channel's four newest uploads) | `A8E_XRwkhTk` + `PJWtlDxvmIc ABsywqtZp_k U2rgdUjobD0 SyIj1XDTAiE` (featured + the first four of Meg's list) |
| Text removed | "Go Back To Your Mama Live at Shelton Manor · The Catch that Got Away · The Ghost of California · Breaker Breaker" | |
| Text added | | "Don't Wanna Let You Go · GO BACK TO YOUR MAMA · Monster, Live October 2024 · The End of an Error" |
| Images removed / added | the four `i.ytimg.com/vi/<id>/hqdefault.jpg` thumbnails, each side | |
| Links | **identical** (0 removed, 0 added) | |
| Page height | 24–25 px shorter after, at every width, both routes | |

## 3. Why the page is 24 px shorter, proven (`region-proof-real.json`)

The four new titles wrap one line shorter in the right rail. Measured with a script that opens both servers at each width with the **same viewport height**, waits for every image, reads the Videos `<section>`'s bounding box on each side, and compares pixels in three regions (tolerance 40 per channel, the same measure that reported 0 on the noise floor):

| route | width | section Δ | page Δ | px differing above | inside | below (aligned) | below, allowing a 1-row shift |
|---|---|---|---|---|---|---|---|
| / | 390 | −24.5 | −24 | 0 | 41,095 | 11,612 | 8,970 |
| / | 768 | −24.5 | −25 | 0 | 41,795 | 21,545 | **0** |
| / | 1024 | −24.5 | −25 | 0 | 41,788 | 20,464 | **0** |
| / | 1440 | −24.5 | −24 | 3 | 41,767 | 22,664 | **0** |
| / | 1920 | −24.5 | −24 | 3 | 41,768 | 22,662 | **0** |
| /media | 390 | −24.5 | −24 | 0 | 42,763 | 75,973 | 283 |
| /media | 768 | −24.5 | −24 | 0 | 43,700 | 42,517 | 2,618 |
| /media | 1024 | −24.5 | −24 | 0 | 43,651 | 108,348 | 2,292 |
| /media | 1440 | −24.5 | −25 | 0 | 44,079 | 120,911 | 473 |
| /media | 1920 | −24.5 | −25 | 0 | 44,090 | 120,843 | 479 |

Reading it:
- **Section top identical, above-region 0 (or 3 px)** on every pair: nothing above the Videos section changed.
- **Section Δ equals page Δ** on every pair: the whole page change is the section's own change.
- **Inside** ≈ 42k px on every pair: the four thumbnails and titles (see the crop below).
- **Below, aligned by integer rows**, showed 1–2 % differing pixels. Viewed (`shots/media/1440-below-section-aligned-diff.png`), it is photo *edges* and glyph *outlines* — the signature of a half-pixel offset, and the section shrank by a fractional **24.515625 px**. Recounted allowing one row of shift, the residue is **0** on Home at 768–1920 and a few hundred pixels on `/media`: photo cells whose lazy image had not painted on one side at capture time (the diff image shows the broken-image glyph in those cells). Home @390 keeps 8,970 px (≈1 % of the region) of the same lazy-image class. None of it is a layout or content change; the `refs.images` list below the section is identical on both sides.

## 4. What was reviewed by eye

- `shots/media/1440-videos-section-before-above-after-below.png` — the Videos section on `/media` @1440, before (top) and after (bottom): same player, same featured video, four different tiles, the rail one line shorter.
- `shots/media/1440-below-section-aligned-diff.png` — the region under the section, red where pixels differ: edges and a handful of unloaded cells, no moved or missing element.

Full-page screenshot pairs (10 × 2) were reviewed and then archived in the session scratchpad rather than committed (Sprint 11 convention: JSON reports in the repo, pixels regenerable — learning #28).

## 5. Verdict

Every difference is the four playlist tiles and the one line of rail height they release. Nothing else on either route changed at any of the five widths. Metadata, links and the redirect suite are untouched (this PR changes no route, config or redirect).
