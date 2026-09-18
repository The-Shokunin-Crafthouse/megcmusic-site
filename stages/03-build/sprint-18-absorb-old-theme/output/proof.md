# Sprint 18 — proof record (2026-09-17)

## Parity (local production build vs megcmusic.com, body text)

| Route | Diff lines | Of which the footer | Other |
|---|---|---|---|
| `/` | 43 | (footer already there; moved outside the page wrapper) | show rows (live data) |
| `/shows` | 98 | 3 | show rows |
| `/shop` | 35 | 3 | product rows |
| `/music` | 3 | 3 | **0** |
| `/music/shadows-of-a-ghost-town` | 21 | 3 | WP-body sections production cannot server-render |
| `/music/kindred-spirits` | 13 | 3 | same |
| `/epk` | 118 | 3 | set list + kit files from WP bodies |
| `/media` | 6 | 3 | the empty-state sentence (intended: no old-theme link) |
| `/booking` | 3 | 3 | **0** |
| `/poetry` | 3 | 3 | **0** |
| `/fyc/shadows-of-a-ghost-town` | 3 | 3 | **0** |
| `/fyc/kindred-spirits` | 3 | 3 | **0** |

The three footer lines ("BOOK ME", "Request A Gig", the copyright) are the intended change on every non-Home route. `/megs-playbook` renders no `<footer>` (gated with the chrome); `/booking` renders one.

## The absorbed pages

| WordPress page | Live route | Rendered |
|---|---|---|
| Reviews: Shadows of a Ghost Town (5134) | `/music/shadows-of-a-ghost-town/reviews` | 200; every outlet link (8) as an external link with "(opens in a new tab)"; the cover image through Photon |
| Kindred Spirits Review (5339) | `/music/kindred-spirits/reviews` | 200; the K4CO quote as the pull-quote panel with "Joshua D’Estrada · President of K4CO Radio"; the cover image |
| Photos (5520) | `/media#media-photos` | already the gallery's source; the EPK "Hi-res photos" button and the gallery empty state no longer leave the site |

Links that pointed at the old theme now read the live route wherever Meg's fields carry them: release review rows (`getReviews`), EPK press coverage (`liveHref`). Grep of the built `/epk` and `/music/shadows-of-a-ghost-town`: no `admin.megcmusic.com/reviews…` or `…/photos/` href.

## Tests

`npm test` 61/61. Press-page parser red before it existed, green after; two parse shapes found on the real pages (attribution as trailing paragraphs; gallery nested in the blockquote) each added as a test before the fix. Oracle extended: rewritten hrefs, the eight outlet links, the K4CO quote and image, and no old-theme link in EPK press coverage. `layout:check` green; `tsc` clean.

## Plugin 1.5.1

Route map + rebuild list for the three pages; PHP test updated (photos now routes; the three absorbed pages pinned). Upload once after merge.
