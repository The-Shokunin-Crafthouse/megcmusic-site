# Live site ↔ WordPress dashboard — 1:1 audit (2026-09-17)

Read from the code on `main` at `24299b9`, the public WP REST API (`admin.megcmusic.com/wp-json/wp/v2`), and the field groups in `wp-plugin/megc-site-content/acf-json/`. Three read-only agents walked every route top to bottom; this file is their consolidated record. Source classes: **WP-ACF** (a field Meg edits, snapshotted at build), **WP-body** (a page body read over REST — at request time on the server, which cannot reach WordPress in production, so effectively in the visitor's browser), **WP-other** (WooCommerce / The Events Calendar / YouTube / Behold), **REPO** (hardcoded), **DERIVED**.

## 1. Every WordPress page, and where it lives on the site

| WP page | id | Live route | Fields read by the site today | Verdict |
|---|---|---|---|---|
| Home | 4 | `/` | Home group (bio, quote, recognition, Instagram, mailing list, socials, meta, hero photo, `home_blocks`) | **wired** |
| Music | 5562 | `/music` (+ `/music/<slug>`) | Music group (lede, releases, artist links, meta) | wired · **body prose never reaches production** (server-only read) |
| EPK (`press-kit`) | 608 | `/epk` | Press Kit group (all fields) + body file links (browser) | **wired** |
| Media | 10 | `/media` | Media Page group (lede, meta) | **wired** |
| Media — Videos | 5560 | `/media#media-watch`, Home | Videos group | **wired** |
| Site: Poetry | 6326 | `/poetry` | Poetry group (all) | **wired** |
| Booking (`contact-me`) | 5 | `/booking` | **none** — `page_lede`, `intro`, `include_items`, `fact_formats/based/plays`, `meta_title`, `meta_description` all unread | **DEAD (8 fields)** |
| Shows (`events`) | 20 | `/shows` | **none** — `page_lede`, `meta_title`, `meta_description` unread (only `page_photo`) | **DEAD (3 fields)** |
| Shop | 1847 | `/shop` | **none** — same three unread (only `page_photo`) | **DEAD (3 fields)** |
| Solo Acoustic | 2931 | `/music#music-formats` | **none** — `format_label`, `format_blurb` unread; photo read from body in browser | **DEAD (2 fields)** |
| Full Band | 2939 | `/music#music-formats` | **none** — same | **DEAD (2 fields)** |
| Collabs | 3742 | `/music#music-collab` | **none** — `collab_groups`, `cave_crew_url` unread | **DEAD (2 fields, 2×3 rows)** |
| Shadows of a Ghost Town | 4350 | `/fyc/shadows-of-a-ghost-town`, `/music/shadows-of-a-ghost-town` | FYC Campaign group (all); **`reviews` repeater unread** | FYC wired · **reviews DEAD** |
| Kindred Spirits | 4378 | `/music/kindred-spirits` | body (browser); **`reviews` unread** | **reviews DEAD** |
| Songs From The Sofa | 4395 | `/music/songs-from-the-sofa` | body; `reviews` unread | reviews DEAD (empty today) |
| Breaker Breaker | 4403 | `/music/breaker-breaker` | body; `reviews` unread | reviews DEAD (empty today) |
| Ain't Going Back | 4411 | `/music/aint-going-back` | body; `reviews` unread | reviews DEAD (empty today) |
| FYC (Kindred, archived) | 4566 | `/fyc/kindred-spirits` | album, category, cycle, pitch, first video | `quotes`, `release_meta`, `lyric_sheets`, videos 2..n unused **by page design** (archived, minimal) |
| Sample Set List | 3666 | `/epk#epk-setlist` | body (browser) | wired |
| Photos | 5520 | `/media#media-photos` (tiles); page itself linked from `/epk` "Hi-res photos" and the gallery empty state | body (browser) | wired · **old theme still serves the page** |
| Reviews: Shadows | 5134 | — (linked from release reviews) | none | **old-theme page, live site links to it** |
| Kindred Spirits Review | 5339 | — (linked from release reviews) | none | **old-theme page, live site links to it** |
| Cart / Checkout / My account | 1848 / 1849 / 1850 | — | WooCommerce | stays on WordPress (transactional; contract §3) |
| Tickets Checkout / Order Completed | 3547 / 3548 | — | Event Tickets | stays on WordPress |

**Proof the dead fields are being edited.** Page 4350's `reviews` repeater carries a third row — "Nominated for Album of the Year by the Josie Music Awards and the Mountain West Country Music Association!" — that is not in `src/config/reviews.ts` and has never rendered. Meg added it and nothing happened. The migration (`scripts/wp-migrate/migrate-content.ts:144-204`) wrote every one of these groups on 2026-09-05; Sprint 11 Phase 3 then rewired FYC, EPK, media, poetry, home, hero and discography and stopped. `docs/meg-editing-guide.pdf` §02 promises all of them.

## 2. Per-route section inventory

Order is fixed in code on every route; no route lets Meg add, remove or reorder a section except Home's `home_blocks` zone.

### `/` — `src/app/page.tsx` (HomeScene → LinerNotes → Instagram → HomeBlocks → EPK+BootScene → Videos → Newsletter → Discography → Singles → SiteFooter)
- WP-ACF: hero photo (4 `hero_photo`), bio ×3, pull quote + credit, recognition rows, Instagram caption/handle/url, blocks zone, EPK teaser rows (608 `kit_items`), videos (5560), newsletter headline/blurb/birthday note, releases (5562), footer socials (4). Metadata from 4 `meta_title`/`meta_description` via `layout.tsx`.
- WP-other: shows (TEC REST `tribe/events/v1/events`), Instagram tiles (Behold), video titles (YouTube oEmbed), covers (WP featured image → product image, browser).
- REPO only: section labels ("Liner Notes", "Instastar", "What's New", "Electronic Press Kit", "Latest Videos", "The Mailing List", "Discography", "Singles", "Shows", "Recognition"); shows tabs/empty copy/search copy (`ShowsSection.tsx:26-49,278,287,311-319,376,385`); "New reels & photos land here" (`Instagram.tsx:167`); newsletter labels/placeholders/errors (`Newsletter.tsx:65-93,108,114-187`); "Spotify/Apple/Buy" (`Discography.tsx:19-21`); footer "BOOK ME", "Request A Gig", © 2026 (`SiteFooter.tsx:29,56,59`); nav labels (`navItems.ts:10-17`).
- Defects: footer CTA href was `${WP_ORIGIN}/contact-me/` (`SiteFooter.tsx:13`) — fixed in PR 1; `SiteFooter` mounts only on `/`; no `not-found.tsx`; no OG/Twitter metadata anywhere but the FYC page.

### `/shows` — `src/app/shows/page.tsx`
- WP-ACF: background (20 `page_photo` → 4 `hero_photo`). WP-other: events (paginated TEC REST).
- REPO: title/description (`page.tsx:12-14`), h1 "Shows", lede (`page.tsx:66-68`) — **all three have WP fields on page 20** (Page Basics group). ShowsSection strings as on Home.

### `/shop`, `/shop/[slug]` — `src/app/shop/**`
- WP-other: products (wc/v3 server, Store API browser), images, prices, stock text, descriptions. WP-ACF: background (1847 → 4).
- REPO: title/description (`shop/page.tsx:12-14`), h1 "Merch & Music", lede (`:49-52`) — **WP fields exist on page 1847**. Product/cart UI strings (`ProductGrid.tsx:56-104`, `CartDrawer.tsx:103-288`, `ProductDetail.tsx:64-169`, `AddToCart.tsx:43-101`). "Open the full store" → `${WP_ORIGIN}/shop/` (commerce fallback, stays).
- Note: server path hardcodes `stockText: ""` (`woocommerce.ts:116`) so SSR always says "In stock".

### `/booking` — `src/app/booking/page.tsx`
- WP-ACF: background only. **Every visible word is REPO** — title/description (`:7-9`), h1, lede (`:46-49`), intro paragraph (`:59-63`), "What to include" + 4 items (`:13-18`), facts Formats/Based/Plays (`:21-25`) — and every one has a field in `group_megc_booking.json` (page 5), populated. Form labels/errors are REPO by design (`BookingForm.tsx`, `api/booking/route.ts:50-57`).

### `/music` — `src/app/music/page.tsx`
- WP-ACF: lede, meta, releases → Discography + Singles, artist links. WP-body: "Liner Notes" intro (≥6-word paragraphs of page `music`) — **server-only read, never renders in production**.
- REPO: Live Formats cards from `src/config/formats.ts:13-26` (**fields exist on 2931/2939**); Work With Me groups + Cave Crew URL from `src/config/collaborate.ts:7-34` (**fields exist on 3742**); labels "Music", "Liner Notes", "Live Formats", "Work With Me", "Book or collaborate", "Join the Cave Crew".

### `/music/[slug]` — `src/app/music/[slug]/page.tsx`
- Slugs from the 5562 releases rows with a `release_page` (`releases-content.ts:116-132`); one REPO override `songs-from-the-sofa-2 → songs-from-the-sofa` (`src/config/releases.ts:27`). "Everything You Are To Me" has no page → no route.
- WP-ACF: title/year/kind/links; background per release page. WP-body (browser fallback): About the Record prose, lyric sheets.
- REPO: press quotes from `src/config/reviews.ts:19-40` (**`reviews` repeater exists on every release page**); description sentence (`page.tsx:43`); "All music", "About the Record", "Liner Notes & Lyrics" + its instruction line (`ReleaseBody.tsx:51-70`), "What People Are Saying".

### `/epk` — `src/app/epk/page.tsx`
- WP-ACF: lede, facts ×4, kit rows, press rows, set-list intro, resources note, meta (608); bio + quote (4); Discography (5562). WP-body (browser): auto-discovered file links, set list (3666).
- REPO: "Electronic Press Kit", "Request a gig", "The Story", fact labels (`epk-content.ts:71-74`), "Press Kit", "What People Are Saying", "Sample Set List", "Photos & Booking", "Everything else you need", "Media gallery", "Hi-res photos" → `${WP_ORIGIN}/photos/` (`page.tsx:31,206`), "Download"/"View"/"Coming soon".
- Defect (diagnosis §6.4): auto-discovered links are not de-duplicated against named kit rows.

### `/media` — `src/app/media/page.tsx`
- WP-ACF: lede, meta (10); videos (5560). WP-body (browser): photos page tiles (5520). WP-other: YouTube oEmbed titles.
- REPO: "Media", "Watch", "Photos", "More videos", "Watch on YouTube", "Visit her YouTube channel" + channel id (`src/config/videos.ts:17-20`), photo-grid controls and empty state → `${WP_ORIGIN}/photos/` (`PhotoGrid.tsx:100-107`).

### `/poetry` — `src/app/poetry/page.tsx`
- WP-ACF: everything textual (site-poetry). WP-other (browser): cover from product `secrets-from-a-songbird` (`src/config/poetry.ts:13`). REPO: "★★★ Poetry", "Buy the book" ×2, "Inside the Pages", buy fallback `/shop/secrets-from-a-songbird` (`config/poetry.ts:14`, used while `buy_url` is empty).

### `/fyc/shadows-of-a-ghost-town`, `/fyc/kindred-spirits`
- WP-ACF: all campaign fields (4350 / 4566), lyric sheets downloaded at build, listen links from 5562. REPO: section labels, "For Your Consideration", OG description with **2025 hardcoded** (`shadows/page.tsx:24`), "The album / Press kit / Contact". Kindred page renders only `videos[0]` and no quotes/lyrics/release line by design (archived).

### Chrome (every route)
- Nav labels/hrefs/order REPO (`navItems.ts:10-17`); logo SVGs; mobile menu strings. Footer only on `/`. No legal links anywhere. 404 is Next's built-in.

## 3. The gap, ranked

1. **Six dead field groups — 11 WP pages, 20+ fields** (§1). Meg edits, nothing happens, guide says it will. → **Sprint 16 Phase 2.**
2. **Music page intro** is read server-side only, so production never shows it. → Phase 2 (build-time read).
3. **Old-theme surfaces the live site still links to**: `/photos/` (from `/epk` and the gallery empty state) and the two review pages (from release reviews). → Phase 2 keeps the links; a later phase either absorbs the review pages into the `reviews` repeater (the `link` field already exists) or leaves them as WordPress pages.
4. **No add/remove/reorder anywhere but Home's zone.** → Sprint 17 (blocks everywhere), designed in the Sprint 16 contract §4.
5. Smaller: footer only on Home; no `not-found.tsx`; no OG metadata; EPK duplicate-download risk; FYC OG year hardcoded; `/shop` SSR stock text.
