# Phase B — Page classification (B.0)

Date: 2026-09-09 · Runner: the building session · Contract: `../CONTEXT.md` §4

## What was read, and from where

| Source | How | Result |
|---|---|---|
| Published pages | Public REST `wp/v2/pages?per_page=100` | 35 |
| Drafts, pending, private, future | Authenticated REST via `wp-ops.yml` `read-config` (run 34373577661) | 4 drafts, 0 pending / private / future |
| Trash | Same run, `status=trash` | empty (confirmed in wp-admin too) |
| Front page / posts page | `wp/v2/settings` (auth) | `show_on_front=page`, `page_on_front=4`, `page_for_posts=0` |
| WooCommerce pages | `wc/v3/settings/advanced` (auth) | cart 1848 · checkout 1849 · my-account 1850 · terms (unset) |
| Event Tickets pages | Not exposed over REST. Read from wp-admin → Pages post-state labels (Levi logged in) | 3547 "Tickets Commerce Checkout Page" · 3548 "Tickets Commerce Success Page" |
| Privacy policy | wp-admin post-state label (the REST settings endpoint does not carry it) | page 3, draft, "Privacy Policy Page" |
| WP menus | `wp/v2/menus` + `menu-items` (auth) | Menu 2 "Menu" (the old theme's nav): Shows, Media, EPK, Booking, Shop, FYC Shadows, About ▸ Photos, Videos. Menu 3 "Pages": About, Shows, Media ▸ FYC Shadows, EPK, Booking, Shop, Band, Connect, FYC (Kindred) |
| Links from the live site | Every production route fetched and grepped for `megcmusic.com/<slug>` hrefs | Only 5134 and 5339 among the candidates (see rows) |
| References from tracked pages' ACF / body | Live ACF of all 20 tracked pages, exact `megcmusic.com/<slug>/` match | 608 → 5134 (×2) · 4350 → 5134 (×4) · 4378 → 5339 (×2). Nothing else |
| `next.config` redirects | Read | `/fyc` and `/shadows-of-a-ghost-town` → `/fyc/shadows-of-a-ghost-town`. No candidate is a target |
| Release rows on the Music page | `releases[].release_page` | 4350, 4378, 4395, 4403, 4411 — 4386 is not referenced |

Could not read: inbound links the business uses outside the site (Instagram bio, newsletter footer, printed material). Those are questions for Levi, asked below, not inferred.

## Classes

- **Tracked-live** — in the plugin's 20-id list (19 ids + `site-poetry` by slug) and rendered on the live site.
- **Tracked-dormant** — tracked, not linked from live nav. Leave alone.
- **Protected** — not tracked, live-critical. Membership only from a system read (settings, Woo, post-state label, a live link, a tracked page's field), never guessed.
- **Orphan candidate** — none of the above, with every test below passed: not linked from the live site · not a redirect target · not referenced by a tracked page's field · not in a WP menu · no known inbound link. A page that fails any test is **ambiguous**, stays out of the trash list, and is named as such.

## Every page (39)

| id | title | slug | status | modified | class | evidence |
|---|---|---|---|---|---|---|
| 4 | Home | home | publish | 2026-09-09 | tracked-live | `page_on_front`; SURFACES.home. Title written this sprint (was empty) |
| 5 | Booking | contact-me | publish | 2026-09-05 | tracked-live | tracked; `/booking` |
| 10 | Media | media | publish | 2026-09-05 | tracked-live | tracked; `/media` |
| 20 | Shows | events | publish | 2026-09-05 | tracked-live | tracked; `/shows` lede |
| 608 | EPK | press-kit | publish | 2026-09-05 | tracked-live | tracked; `/epk` |
| 1847 | Shop | shop | publish | 2026-09-05 | tracked-live | tracked; `/shop` lede; also Woo "Shop Page" |
| 2931 | Solo Acoustic | solo-acoustic | publish | 2026-09-05 | tracked-live | tracked; Music live-format card |
| 2939 | Full Band | full-band | publish | 2026-09-05 | tracked-live | tracked; Music live-format card |
| 3666 | Sample Set List | sample-set-list | publish | 2026-07-01 | tracked-live | tracked; EPK set-list source; linked from live `/epk` |
| 3742 | Collabs | collabs | publish | 2026-09-05 | tracked-live | tracked; Music "Work With Me" |
| 4350 | FYC Shadows of a Ghost Town | shadows-of-a-ghost-town | publish | 2026-09-08 | tracked-live | tracked; release page + `/fyc/shadows-of-a-ghost-town`; redirect target |
| 4378 | Kindred Spirits | kindred-spirits | publish | 2026-09-05 | tracked-live | tracked; `/music/kindred-spirits` |
| 4395 | Songs From The Sofa | songs-from-the-sofa-2 | publish | 2025-07-14 | tracked-live | tracked; canonical release page (`releases[].release_page` = 4395); `/music/songs-from-the-sofa` |
| 4403 | Breaker Breaker | breaker-breaker | publish | 2026-04-01 | tracked-live | tracked; `/music/breaker-breaker` |
| 4411 | Ain't Going Back | aint-going-back | publish | 2025-07-14 | tracked-live | tracked; `/music/aint-going-back` |
| 5520 | Photos | photos | publish | 2026-04-01 | tracked-live | tracked; Media gallery source; linked from live `/media` |
| 5560 | Media — Videos | videos | publish | 2026-09-09 | tracked-live | tracked; SURFACES.videos. Renamed this sprint; slug unchanged |
| 5562 | Music | music | publish | 2026-09-05 | tracked-live | tracked; `/music` + release registry |
| 6326 | Site: Poetry | site-poetry | publish | 2026-09-05 | tracked-live | tracked by slug; `/poetry` |
| 4566 | FYC | fyc-kindred-spirits-meghan-clarisse | publish | 2026-09-05 | tracked-dormant | tracked; `/fyc/kindred-spirits` renders but is not in nav; in menu 3. Leave alone (contract) |
| 1848 | Cart | cart | publish | 2022-10-01 | **protected** | `woocommerce_cart_page_id` = 1848; the headless cart replays into this origin's Woo cart |
| 1849 | Checkout | checkout | publish | 2022-10-01 | **protected** | `woocommerce_checkout_page_id` = 1849; the hand-off destination (decisions.md 2026-07-05) |
| 1850 | My account | my-account | publish | 2022-10-01 | **protected** | `woocommerce_myaccount_page_id` = 1850 |
| 3547 | Tickets Checkout | tickets-checkout | publish | 2024-08-23 | **protected** | wp-admin post state "Tickets Commerce Checkout Page" |
| 3548 | Order Completed | tickets-order | publish | 2024-08-23 | **protected** | wp-admin post state "Tickets Commerce Success Page" |
| 3 | Privacy Policy | privacy-policy | **draft** | 2019-04-19 | **protected** | wp-admin post state "Privacy Policy Page" (WP's designated privacy page, even as a draft) |
| 5134 | Reviews: Shadows of a Ghost Town | reviews-shadows-of-a-ghost-town | publish | 2026-05-14 | **protected** | Linked from the live site: `/epk` and `/music/shadows-of-a-ghost-town` (via ACF fields on 608 and 4350). Not an orphan |
| 5339 | Kindred Spirits Review | kindred-spirits-review | publish | 2026-02-20 | **protected** | Linked from live `/music/kindred-spirits` (via ACF on 4378). Not an orphan |
| 47 | About | about | publish | 2026-07-03 | **ambiguous** | Not linked from the live site, not a redirect target, not in any tracked field — but a top-level item in **both** WP menus (item 4479, parent of Photos and Videos; item 49). Fails the menu test. Pre-rebuild bio page; the live bio lives on Home |
| 2946 | Band | band | publish | 2026-02-19 | **ambiguous** | Body is one gallery image (the "Her Cavemen" press-kit graphic). In WP menu 3 (item 2961). Fails the menu test |
| 3750 | Connect | connect | publish | 2024-11-23 | **ambiguous** | "Join the Cave Crew Community! Facebook · Instagram · YouTube · Mail" — a link-hub page. In WP menu 3 (item 3756). Fails the menu test, and is the kind of page an Instagram bio points at — **ask** |
| 3782 | Newsletter Signup | newsletter-signup | publish | 2024-11-24 | orphan candidate | Empty body (0 bytes rendered). No link, redirect, field reference or menu item. Renders nothing at its own URL |
| 4386 | Songs From The Sofa | songs-from-the-sofa | publish | 2025-07-14 | orphan candidate | Duplicate of the canonical 4395 (`songs-from-the-sofa-2`); the Music page's release row points at 4395; no link, redirect, field reference or menu item. Caveat: `admin.megcmusic.com/songs-from-the-sofa/` was the release's original public URL in 2025 — trashing it 404s that origin-side URL only; the apex already routes `/music/songs-from-the-sofa` to 4395 |
| 5590 | An Intimate Songwriting Workshop with Amy Speace… | an-intimate-songwriting-workshop-… | publish | 2026-04-03 | **ambiguous** | An April 2026 event page. No link, redirect, field reference or menu item on the site — but an event page is exactly what gets shared on social and in a newsletter. **Ask** whether it still receives visitors |
| 6060 | Mail | mail | publish | 2026-07-03 | **ambiguous** | Body is only a Mailchimp "connected site" `<script>` (mcjs) in a code block — it renders as literal text, not a form. No link, redirect, field reference or menu item. Looks abandoned; **ask** whether anything (Instagram bio, Mailchimp) points at `/mail` |
| 6073 | Subscribe | subscribe | publish | 2026-07-03 | **ambiguous** | A Mailchimp embedded sign-up form. The old theme's header links `www.megcmusic.com/subscribe/`, which today 308s to `megcmusic.com/subscribe` and **404s on the Next site** — so any inbound `/subscribe` link is already broken on the apex, while `admin.megcmusic.com/subscribe/` still works. Title written this sprint (was empty). **Ask** whether her bio or newsletter uses it; if so, the fix is a redirect on the Next site, not a trash |
| 2936 | Duo | duo | **draft** | 2024-06-10 | orphan candidate (draft) | A third live-format card never published (Solo Acoustic and Full Band shipped). Invisible to visitors; only clutters "All" |
| 1842 | Merch | merch | **draft** | 2022-10-01 | orphan candidate (draft) | Woo-era draft; the shop is `/shop` over page 1847 |
| 1851 | Refund and Returns Policy | refund_returns | **draft** | 2022-10-01 | orphan candidate (draft) | WooCommerce's auto-created draft; `woocommerce_terms_page_id` is unset, so nothing points at it. If Levi would rather keep a policy page for the store, it stays |

## Summary

| Class | Count | Ids |
|---|---|---|
| Tracked-live | 19 | 4 5 10 20 608 1847 2931 2939 3666 3742 4350 4378 4395 4403 4411 5520 5560 5562 6326 |
| Tracked-dormant | 1 | 4566 |
| Protected | 8 | 1848 1849 1850 3547 3548 3 5134 5339 |
| Orphan candidate | 5 | 3782 4386 · drafts 2936 1842 1851 |
| Ambiguous (stay out of the list) | 6 | 47 2946 3750 5590 6060 6073 |

The contract's candidate list had ten ids. Two (5134, 5339) moved to protected on evidence — they are linked from the live site. Four (47, 2946, 3750) fail the WP-menu test and one (5590) plus the two Mailchimp pages (6060, 6073) need Levi's answer on inbound links. Nothing is resolved by including it.

## B.1 — the gate (Levi, one line, by id)

**Trash list proposed:** `3782, 4386, 2936, 1842, 1851` — two published pages that nothing reaches and three drafts.

**Questions that would move an ambiguous page into the list:**
1. **47 About, 2946 Band, 3750 Connect** sit in the WP menus the old theme renders at `admin.megcmusic.com`. Nobody reaches that theme through the live site, but the menu test is the contract's rule. Option: remove the three menu items (wp-admin → Appearance → Menus, or a `DELETE wp/v2/menu-items/{id}` op) and then trash — say yes to both, or keep them.
2. **3750 Connect, 6060 Mail, 6073 Subscribe** — does anything outside the site (Instagram bio, newsletter footer, Mailchimp) point at any of these? If `/subscribe` is in use, the right fix is a `/subscribe` redirect on the Next site to the newsletter section, and the page stays.
3. **5590 Amy Speace workshop** — is that April event over and unlinked, or still shared?

Nothing moves before the answer. After B.2 a manual production deploy is needed (untracked pages do not fire the dispatch), and Levi confirms the Woo checkout hand-off from his own browser (B.3).

## B.1 — resolved

- **2026-09-09, Levi:** "Yes, trash 3782, 4386, 2936, 1842, 1851." → trashed (see `phase-b-trashed.md`, first batch).
- **2026-09-10, Levi:** 47 / 2946 / 3750 — "remove them and trash"; 3750 / 6060 / 6073 — nothing points at them, "remove"; 5590 — "old, you can remove and trash as well." → the four menu items removed (children reparented first), the six pages trashed (second batch).

Final state: 35 published pages → 27. Tracked-live 19, tracked-dormant 1, protected 7 published + 1 draft (privacy page). Every page a visitor can reach is either rendered by the site, a Woo / Event Tickets system page, or a review page the site links to.
