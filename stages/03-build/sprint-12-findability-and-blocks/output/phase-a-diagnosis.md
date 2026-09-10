# Phase A — Diagnosis: why a video Meg adds does not show

Date: 2026-09-09 · Runner: the building session (Claude Code, Levi's Mac, residential IP) · Contract: `../CONTEXT.md` §3 A.0

Every "verified" line in the contract's §1 was re-read live before use (learning #123). Two were stale by the time this session ran; both are recorded at the end.

## Result

**Confirmed cause: hypothesis 1 — truncation and ordering.** Her curated list is outranked by the channel's newest uploads and the gallery shows five tiles, so her list never reaches a tile. Hypotheses 2 and 4 are ruled out with evidence. Hypothesis 3 is a real, separately observed findability defect that compounds the problem but does not cause it. Hypothesis 5 is asked, not inferred.

## Hypotheses, in prior order

| # | Hypothesis | Discriminating test | Result | Verdict |
|---|---|---|---|---|
| 1 | Truncation and ordering: `getVideos()` merges featured → channel RSS → her list → extras, and `VideosGallery` renders `.slice(0, 4)` of the rest | Compare the five ids rendered on production `/media` and `/` against page 5560's `video_list` and the channel RSS | Production `/media` and `/` render `A8E_XRwkhTk` (her featured) then `AnSq5PmNqd0 GBTHE_ilib4 c7g7f5NsTWU QXPwWRmZlSc` — exactly the four newest RSS ids. Her list holds nine ids: `A8E_XRwkhTk PJWtlDxvmIc ABsywqtZp_k U2rgdUjobD0 SyIj1XDTAiE WeYjhIiKNiU xqS1ZpZF7Fc hwLbMyR4SLw 0gv7iGWPnXU`. **None of the eight non-featured ids renders.** Three of them (`hwLbMyR4SLw xqS1ZpZF7Fc 0gv7iGWPnXU WeYjhIiKNiU`) are in the RSS feed at positions 11–15 — behind the cut either way. | **Confirmed** |
| 2 | Wrong page: on 2026-09-08 she wrote video URLs into page 4 (Home) or 4350 (FYC) | Diff live ACF of 4 and 4350 against the committed snapshot / production render; grep every text field for a YouTube URL | Page 4: the only change is `recognition`, 5 rows → 10 rows (Mountain West CMA nominations, the CCMHOF Golden Star award). No YouTube URL in any text field except the standing `youtube_url` channel link. Her edit **is live on production** (`Mountain West` present in `/` HTML) — the pipeline worked. Page 4350: the `videos` repeater holds 6 rows and production `/fyc/shadows-of-a-ghost-town` renders those 6 in that order; no YouTube URL in any non-repeater field. She edited the right pages for what she was doing; neither edit touched the video list. | **Ruled out** |
| 3 | Findability: "Videos" is not adjacent to "Media" in her page list, and Home reads "(no title)" | Observe wp-admin → Pages as she sees it (local Chrome, Levi logged in as Admin12) | Observed. **39 items on two pages of 20**, sorted by title. Page 1 opens with two "(no title)" rows: Home (shown as its first body sentence, "Meghan Clarisse is a Colorado-based singer-songwriter…" — Front Page) and Subscribe (shown as "Subscribe * indicates required Email Address…"). "Media" is the **first** row of page 2; "Videos" is the **last** row of page 2, 19 rows below it, after Merch, Music, My account, Newsletter Signup, Order Completed, Photos, Privacy Policy, Refund and Returns Policy, Reviews, Sample Set List, Shop, Shows, Site: Poetry, Solo Acoustic, two Songs From The Sofa, Tickets Checkout. Trash is empty; four drafts exist (Duo, Merch, Refund and Returns Policy, Privacy Policy). Two screenshots captured (page 1 and page 2); the page text is reproduced in this row because the browser tool did not report a saved path. | **Confirmed as a defect; not the cause of the missing videos** |
| 4 | Client reconcile: `fetchVideosSourceBrowser` returns empty in her browser (CORS, timeout, cached empty) | Load production `/media` in the local browser; read `sessionStorage['mc-videos-source']`; repeat the fetch and read the status | Cache holds `featuredId: A8E_XRwkhTk` and all nine body ids. Live re-fetch: HTTP 200, `acf.featured_video_url` present; from curl with `Origin: https://megcmusic.com` the response carries `access-control-allow-origin: https://megcmusic.com`. The fetch works. **The tiles are still the RSS four** because `reconcile()` places body ids *after* the server list, i.e. after the 15 RSS ids. Page 5560's body carries the same nine embeds as the repeater, so the body path adds nothing. | **Ruled out as a cause; confirms 1** |
| 5 | The guide never reached her | Ask Levi one line | Levi, 2026-09-10: "yes, meghan has the guide." She had it; it was not working (the merge order was), which is consistent with everything above. | **Ruled out** |

Raw responses were read, not inferred from status codes (learning #46): every REST read above was a 200 with the expected shape; the only non-200s were the expected 401s on `wp/v2/settings` and `wp/v2/menus` without auth and a 400 on `?status=draft` without auth.

## What this means for the fix (A.1)

- The **code fix** is required: the merge must honor the field's help text ("The playlist order on Home and Media") — featured → her list in her order → channel → extras. Five-tile cap unchanged (a design change is Levi's call; contract §3).
- The **rename** is warranted by hypothesis 3, which was observed, not assumed: "Videos" becomes "Media — Videos" so it sorts directly under "Media"; Home gets its title back; Subscribe gets its title. Slugs untouched (invariant §2), verified after the write.
- The **field move** and the **dashboard note** are not warranted: the two-page split is not the cause, and both open the plugin human gate. Not taken.

## Contract lines found stale on re-read

1. "Page 5560's body contains zero YouTube embeds" — **false today**: the body carries nine `wp-block-embed-youtube` figures, the same nine ids as the repeater, in the same order.
2. "Three tracked pages have an empty title in WP: 4, 6060, 6073" — **6060 is titled "Mail"**; only 4 (Home) and 6073 (Subscribe) are empty.
3. "Live REST returns 35 published pages" — still true, but wp-admin shows **39**: four drafts (Duo, Merch, Refund and Returns Policy, Privacy Policy) are invisible to unauthenticated REST. Carried into Phase B.

## Evidence files

Live responses this diagnosis read are in the session scratchpad (not committed — they are regenerable reads of production). The production tile sets were read from `https://megcmusic.com/media` and `/` HTML at 2026-09-09; the channel RSS from `https://www.youtube.com/feeds/videos.xml?channel_id=UCCns9wV-KGZI05bsBezql5w`.
