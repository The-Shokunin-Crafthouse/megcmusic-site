# Phase B — Re-verification after the trash (B.3)

Date: 2026-09-10 · Runner: the building session (harness), Levi (checkout hand-off from his own browser — see the end)

Two local production builds of the same `main` commit: one built before any page was trashed (port 3101), one rebuilt after both batches (port 3102). No route reads any trashed page, so the expected result is "no difference beyond the noise floor" — and the noise floor is what says which differences mean nothing.

## Noise floor (3102 vs 3102): 65 pairs, 10 differ

`/` @1440 and @1920 (a release cover image absent on one side), `/poetry` @390 (158,897 px) and @1024 (page height), `/shop` @390 (100 px), and `/megs-playbook` at every width (its panels arrive from an API whenever they arrive). That is the harness measuring itself on live-data pages and lazy images.

## Real run (3101 before vs 3102 after): 65 pairs, 14 differ — all within the floor's classes

| pair | reported | what it is |
|---|---|---|
| `/` @390, @1024 | 181 / 182 px, text · meta · refs identical | the floor's class of sub-200 px pixel noise on Home |
| `/` @1440 | 0 px; one image ref differs | the Songs From The Sofa cover absent on one side — the same class the floor showed with the Shadows cover |
| `/music` @768 | 0 px; one image ref differs | the Music hero image absent on one side |
| `/music/shadows-of-a-ghost-town` @390 | 48,273 px, text · meta · refs identical | reviewed: one solid block, the album cover unpainted on one side (`shots` archived in the session scratchpad) |
| `/poetry` @390 | 0 px; text differs by one "★"; one image ref | the section-label star glyph and the book image not yet painted on one side |
| `/poetry` @1024, @1920 | page height 1167 vs 1245 | the floor shows the same height flip on `/poetry` @1024 |
| `/shop` @390 | 80 px | floor: 100 px on the same pair |
| `/megs-playbook` ×5 | text differs | live API panels, as on the floor |

Head metadata identical on **65 of 65**. Every link identical on 65 of 65 (the only ref differences are lazy images). Routes covered: `/ /music /music/shadows-of-a-ghost-town /music/songs-from-the-sofa /epk /media /poetry /fyc/shadows-of-a-ghost-town /fyc/kindred-spirits /booking /shows /shop /megs-playbook` at 390/768/1024/1440/1920.

## Redirect suite (after both batches)

| request | result |
|---|---|
| `megcmusic.com/fyc` | 308 → `/fyc/shadows-of-a-ghost-town` |
| `megcmusic.com/shadows-of-a-ghost-town` | 308 → `/fyc/shadows-of-a-ghost-town` |
| `http://admin.megcmusic.com/` | 301 → https |
| `www.megcmusic.com` | 308 → apex |

Trashed slugs on the WP origin now 404 (`about band connect newsletter-signup mail subscribe`); `songs-from-the-sofa` **301s to the canonical page** (WordPress's permalink guess), so the 2025 URL still lands somewhere sensible. The review pages the site links to (`reviews-shadows-of-a-ghost-town`, `kindred-spirits-review`), `sample-set-list` and `photos` all still 200.

## Protected pages, loaded in a real browser (Levi's Chrome, logged in)

`/checkout/` — title "Checkout – Meghan Clarisse Cave", h1 "Checkout", WooCommerce checkout markup present. `/tickets-checkout/` — h1 "Tickets Checkout", Tickets Commerce markup present. `/cart/` — "Cart – Meghan Clarisse Cave". (curl from the Mac gets a 406 from the host's bot filter on these; the browser is the honest load.)

## Production

Untracked pages fire no dispatch, so two manual Production Deploys ran: 34428565066 after the first batch (success) and 34428860672 after the second (completed/success).

## Still Levi's (contract B.3)

Confirm the Woo checkout hand-off from your own browser: add a product on `megcmusic.com/shop`, click checkout, land on `admin.megcmusic.com/checkout/` with the line in the cart. The session cannot do that step — the cart replay needs a same-origin session.
