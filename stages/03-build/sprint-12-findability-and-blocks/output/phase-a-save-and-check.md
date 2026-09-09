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
