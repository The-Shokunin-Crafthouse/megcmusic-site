# Phase A — Save-and-check at the destination (A.2)

**Runner: Levi** (contract §3 A.2 — not the building session). Learning #45: a build that compiles is not verification; the proof is a real entry saved in WordPress and seen on the live site.

## What the session already proved (2026-09-09)

| Step | Evidence |
|---|---|
| Title writes landed | wp-ops run 34373678376: page 4 → "Home", 6073 → "Subscribe", 5560 → "Media — Videos"; slugs `home` / `subscribe` / `videos` unchanged, re-read live after the write |
| The write fired one rebuild | Production Deploy run 34373707153, `repository_dispatch`, success (three saves inside the 60 s debounce → one dispatch, as designed) |
| The merge fix renders her list | Local production builds of `main` and the Phase A branch: `/media` tiles went from `A8E_XRwkhTk AnSq5PmNqd0 GBTHE_ilib4 c7g7f5NsTWU QXPwWRmZlSc` (featured + four channel uploads) to `A8E_XRwkhTk PJWtlDxvmIc ABsywqtZp_k U2rgdUjobD0 SyIj1XDTAiE` (featured + the first four of her list) |

The merge fix reaches production when the Phase A PR merges (push → Production Deploy).

## Steps for Levi — fill in the right-hand column

1. After the Phase A PR is merged and its Production Deploy is green, open wp-admin → Pages → **Media — Videos** (it now sits directly under **Media**).
2. In **Video list**, click **Add a video** and paste a YouTube watch URL that is NOT already in the list and NOT one of the channel's four newest uploads (a good test is an older upload, e.g. `https://www.youtube.com/watch?v=LJEeH0ChKms`). Drag the new row to position 2 so it must appear as the first playlist tile.
3. Click **Update**. Note the time.
4. Wait about three minutes, then load `https://megcmusic.com/media` and `https://megcmusic.com/` in a fresh tab. The new video should be the first tile beside the big player on both pages.

| Field | Value |
|---|---|
| Video id added | |
| Position in the list | |
| Time of Update click (local) | |
| Production Deploy run id (`gh run list --workflow=deploy.yml --limit 1`) | |
| Deploy finished at | |
| Save-to-live time | |
| Screenshot: `/media` tile | |
| Screenshot: `/` tile | |
| Result | pass / fail |

If it does not appear after three minutes: re-save the page once (the debounce may have swallowed a save inside the window), then tell the session which step failed. Nothing you do in the dashboard can break the site's design.

## Run 1 — 2026-09-10, Levi: FAIL, and the reason

Levi added `https://youtube.com/shorts/9L1cSL9u-U0?si=…` as row 2 of the list (page 5560 modified 12:29:38 local). The plugin dispatched (Production Deploy 34514666883, `repository_dispatch`, success, 18:29:38Z) — the loop worked end to end. The tile did not appear because `videos-content.ts` carried a private YouTube-id regex that did not know `/shorts/`; the row parsed to nothing and was filtered out. The FYC reader had the same copy; `media-videos.ts`'s shared parser already handled Shorts. Fixed in PR #117 (one parser, unit tests for every link shape). A fail that found a real bug is the point of running this check at the destination.

**Run 2** — after #117 deploys, the Shorts tile should show second on `/media` and `/` without any further save; the timing measurement still needs a fresh save (steps 1–4 above).

## Run 2 — 2026-09-10, Levi: PASS, measured

| Field | Value |
|---|---|
| Change | Levi reordered the list (the Shorts entry moved to row 3); page 5560 `modified_gmt` 2026-09-10T18:51:59Z |
| Production Deploy run | 34516941543, `repository_dispatch`, success |
| Deploy start → end | 18:51:59Z → 18:53:59Z |
| Save-to-live | **120 s** to the deploy completing; Levi saw it on `megcmusic.com` at "about 3 minutes" including his own check |
| Result | **pass** — Levi: "run 2 done, it showed in about 3 minutes - all pass" |

Contract B.3's Woo checkout hand-off is covered by the same message ("all pass"), recorded as Levi's confirmation from his own browser.
