# Phase A follow-up — "show her whole list": parity on `/` and `/media`, reviewed

Levi's call, 2026-09-10: show her whole list. The gallery no longer caps the playlist at four; every video in Meg's list renders in her order, and the channel's newest uploads fill in only when her list is empty. So the change is expected to be **purely additive** — and that is what the harness reports.

**Noise floor** (whole-list server against itself, `/` and `/media` at five widths): 10 pairs, 2 differ (`/` @390 8,124 px and @1440 33 px — Home's live-data noise), `/media` 0 on all five.

**Real run** (`main` vs the whole-list branch): 10 pairs, 10 differ, all by page height only. On `/media` @1440:

| | |
|---|---|
| Text removed | nothing |
| Text added | the four new playlist titles: "Performing Strong on Great Day Colorado with Mark Gabert", "Todd Clayton and Meghan Clarisse perform original song 'Strong' on Colorado & Company", "Fire and Fly by Meghan Clarisse and her band with Don Richmond at Society Hall", "Colorado & Company interview: Meghan Clarisse & Todd Clayton. Original song 'Go Back To Your Mama'" |
| Images removed | nothing |
| Images added | `WeYjhIiKNiU xqS1ZpZF7Fc hwLbMyR4SLw 0gv7iGWPnXU` thumbnails — the 6th to 9th entries of her list |
| Links | identical |
| Head metadata | identical, 10 of 10 |
| Page height | `/media` +877 px at every width; `/` +1,754 px (the harness sizes the viewport to the page, so Home's 100vh hero doubles the delta) |

**Reviewed by eye** — `media-1440-watch-before-above-after-below.png`: before (top) four tiles beside the player; after (bottom) the same four, then four more, the channel link below them. Nothing above or beside the section moved.

**Design consequence, surfaced for Levi:** at 768 px and up the rail is now taller than the player — on `/media` @1440 the eight tiles run about 700 px below the player's bottom edge, leaving open ground under it. That is the honest result of "show her whole list" with the current two-column layout. If it reads wrong, the two refinements worth weighing are a rail that scrolls inside the player's height, or the extra tiles wrapping into a row beneath the player. Either is a design change and Levi's call; neither was made here.

Full-page shots archived in the session scratchpad; `parity.json` is the record.
