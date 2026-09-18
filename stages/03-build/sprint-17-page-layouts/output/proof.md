# Sprint 17 — proof record (2026-09-17)

## 1. Empty layouts = today's page (parity)

Local production build (`npm run build`, this Mac reaches WordPress) served on :3102; visible `<main>` text and the sequence of `aria-labelledby` ids per route, against `megcmusic.com`. No page in WordPress carries a layout field yet (plugin 1.5.0 not uploaded), so every route resolved to its default.

| Route | Text diff | Section order | Reading |
|---|---|---|---|
| `/` | 45 lines | identical | show rows the local server can read from TEC; `useId` renumbering (LEARNINGS 2026-09-11) |
| `/shows` | 91 | identical | show rows; `useId` |
| `/shop` | 32 | identical | product rows the local server can read from WooCommerce |
| `/music` | **0** | identical | — |
| `/music/shadows-of-a-ghost-town` | 26 | identical + the two WP-body sections production cannot server-render | About the Record / Liner Notes from the page body |
| `/music/kindred-spirits` | 12 | same | same |
| `/epk` | 115 | identical | set list + kit files from WP bodies |
| `/media` | 3 | identical | photo grid empty state vs photos |
| `/booking` | **0** | identical | — |
| `/poetry` | **0** | identical | — |
| `/fyc/shadows-of-a-ghost-town` | **0** | identical | — |
| `/fyc/kindred-spirits` | **0** | identical | — |

Every difference is live data the local server can reach and production's runtime cannot, or `useId`. No section moved, dropped or renamed on any route.

## 2. A layout does what it says (injection)

`layout_epk` injected into `src/generated/wp-content/epk.json` (rows: Section: Press Kit · announcement · Section: The Story · text · photo · pull quote · video · Section: Photos & Booking **hidden** · Section: What People Are Saying), then `npx next build` (no prebuild, so the injection survives — LEARNINGS 2026-09-11), served, read and screenshotted. Snapshot restored afterwards; nothing was written to WordPress.

Rendered `aria-labelledby` order: `epk-kit` → announcement → `epk-bio` → text section → `epk-press` → `disco-heading` → `epk-setlist`. Photos & Booking absent. All five blocks present with their text. Photo served from the WordPress host through the media gallery's Photon sizing (`?w=1600&quality=82`).

Screenshots at 1440 and 390 were reviewed in the session and posted in the PR; they are not committed (learning #28 — the preview URL is the record). PR #150's preview deploy:  (Vercel-protected; open it signed in).

## 3. Tests

`npm test` 55/55. Reader and new parsers red before they existed (8 red: module-not-found + not-a-function), green after. Planted bugs, one at a time, each restored: text parser AND→OR (2 red); photo parser raw URL instead of Photon (2 red); layout reader hidden sections returning (1 red); layout reader duplicates allowed (2 red). `npm run layout:check`: 10 groups match the registry. `tsc --noEmit` clean.

## 4. Found on the way

Plugin 1.4.1 was uploaded during this sprint, and ACF applies the new reviews `kind` select's default ("quote") to rows saved before it existed — the two Shadows placements would have flipped to quotes on the next rebuild. Fixed here: the select has no default (Automatic), and the reader never lets an explicit "quote" turn a placement or an unsourced line into a quote. Test added; oracle still green.
