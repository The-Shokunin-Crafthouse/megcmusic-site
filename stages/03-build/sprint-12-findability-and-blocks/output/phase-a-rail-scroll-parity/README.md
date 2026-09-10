# Phase A follow-up — "scroll with player height": parity on `/` and `/media`, reviewed

Levi's call, 2026-09-10: the playlist scrolls within the player's height. At 768 px and up the gallery becomes a two-column grid whose row is the player's 16:9; the rail contributes nothing to that height (`height: 0`) and then fills it (`min-height: 100%`), so the list scrolls inside it however long it grows. A thin gold scrollbar from the accent token; the gold hairlines above and below the list stay put as the affordance. Below 768 px nothing changes.

## What the harness reports

`parity.mjs` on `/` and `/media` at 390/768/1024/1440/1920 (`parity.json`): **text, head metadata and every link and image identical on 10 of 10 pairs.** The only reported difference is page height at 768 and up; 390 is pixel-identical on `/media` and within Home's live-data noise (677 px) on `/`.

Region proof (`region-proof-real.json`, noise floor `region-proof-noise.json` = 0 everywhere):

| route | width | section Δ | page Δ | above | inside | below (±1 row) |
|---|---|---|---|---|---|---|
| /media | 390 | 0 | 0 | 0 | 0 | 0 |
| /media | 768 | −1300 | −1300 | 0 | changed | 632 |
| /media | 1024 | −1156 | −1156 | 0 | changed | 343 |
| /media | 1440 | −1070 | −1071 | 0 | changed | 758 |
| /media | 1920 | −1070 | −1071 | 0 | changed | 722 |
| / | 390 | 0 | 0 | 0 | 0 | 0 |
| / | 768–1920 | −1300 … −962 | same | 0 | changed | see below |

Section top identical on every pair; section Δ equals page Δ on every pair; nothing above the section changed; `/media`'s below-region residue is a few hundred pixels of lazy-image timing.

**Home's below-region number is a capture artifact, proven two ways.** (1) A section map of both builds at 1440 with the same viewport: every section's height is identical except Videos (1785 → 824), and every section below it starts exactly 962 px higher — a uniform shift, nothing else moved. (2) With the viewport sized to the page, Home's full-page document is 17,432 px tall and Chromium's full-page capture stops at 16,384 px: sampled rows 16,390 and beyond are a single colour in the "before" capture, while the "after" page (962 px shorter) still has content there. The solid block in `1440-below-section-aligned-diff.png` begins at exactly that row. Reduced-motion emulation changed nothing, which ruled out animation phase first. `parity.mjs` itself caps the viewport at 16,000 px for this reason.

## Reviewed by eye

- `media-1440-watch-before-above-after-below.png` — before: eight tiles running ~700 px past the player. After: the rail is the player's height, three tiles visible, scrollbar showing, channel link pinned beneath.
- `media-768-watch-before-above-after-below.png` — the same at tablet width. **Surfaced for Levi:** at 768 the player is 260 px wide and 146 px tall, so the rail shows one tile at a time with a scrollbar. It works, and it is the literal result of the rule with the design's fixed 344 px rail; if it reads too tight, the choices are a narrower rail at 768–1023 or stacking the list under the player there.

## Verdict

Text, metadata and refs identical; the only change is the Videos section's height at 768 px and up, and it is the intended one.
