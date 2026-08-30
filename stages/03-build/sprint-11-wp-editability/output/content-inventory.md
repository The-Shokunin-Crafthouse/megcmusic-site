# Sprint 11 — Phase 0 Content Inventory

> Deliverable per contract §3. Status: **complete — presented at the Phase-0 gate 2026-08-29.**
> Companion: `acf-field-design.md` (the full field-group design). Gate: Levi approves both before any build.

## Network-context verification (contract §3, verified empirically 2026-08-29)

| Context | `/wp-json` reads | Authenticated writes | Evidence |
|---|---|---|---|
| Claude Code sandbox (this session — runs on Levi's Mac, **residential IP**) | ✅ 200 | Write path reaches WP core: unauthenticated `POST /wp/v2/pages` → WP `401 rest_cannot_create` JSON (WordPress answered, not a Bluehost datacenter 409). Real authenticated write test pending the application password (Phase-1 human gate). | `curl` 2026-08-29: `GET /wp-json/` 200 · `GET /wp/v2/pages` 200 (34 pages) · `GET /wp/v2/users/me` 401 `rest_not_logged_in` · `POST /wp/v2/pages` 401 `rest_cannot_create` |
| GitHub Actions runner (**datacenter**) | ✅ 200 — verified by probe run 33282133387 (2026-08-29): `GET /wp-json/` 200, `wp/v2/pages` 200, `tribe/events/v1/events` 200, `wp-content/uploads` PNG 200 | Write path reaches WP core: unauthenticated `POST /wp/v2/pages` → WP `401 rest_cannot_create` JSON from the runner | `.github/workflows/wp-probe.yml` (temporary, branch-scoped) + run log |
| Vercel build/runtime (**datacenter**) | ❌ **blocked for `/wp-json`** — verified from production ISR HTML 2026-08-29: `/music/shadows-of-a-ghost-town` contains no "About the Record" section, `/music` contains no WP liner-notes prose, `/` contains no server-rendered shows. Every WP-fed section is absent from the server render and filled by the browser-side residential-IP fallback (`src/lib/api/*-browser.ts` — the architecture the repo already documents in `src/lib/api/wordpress.ts:26-28`). | n/a (never writes) | Raw-HTML greps of `megcmusic.com` production; code comments `src/lib/api/wordpress-browser.ts:3-5` |
| Vercel build → `wp-content/uploads` (static files) | ✅ works | n/a | The 11 FYC lyric PNGs are not committed; `scripts/fetch-fyc-assets.mjs` fetches them from `admin.megcmusic.com/wp-content/uploads/...` (Photon CDN fallback) during `npm run build`, validates bytes, and fails the build loudly on miss — production deploys since 2026-08-28 succeeded, so static-file egress from the Vercel builder works (or the wp.com Photon cache absorbed it; either way the build-time media pattern is proven). |

**The architectural consequence (gate item):** contract §6 says "replace each repo-held content source with a build-time WP/ACF REST read" — but the Vercel builder cannot read `/wp-json`. The build-time read must therefore run where WP is reachable and hand the result to the Vercel build. The GHA probe result decides the mechanism (see `acf-field-design.md` §"Publish pipeline consequence").

**ACF in REST:** not yet installed — `GET /wp-json/acf/v3` → 404 `rest_no_route` (correct pre-install shape). Note: `src/lib/api/wordpress-browser.ts` already requests `_fields=content,acf` on the `videos` page (an `acf.featured_video_url` reader shipped ahead of ACF ever being installed — learning #126's shape, packet type with no producer). Post-install verification of `?acf_format=standard` is the first Phase-1 check.

**Auth model for Phase 2 writes:** WP application password. None exists yet — and the show pipeline's GHA secrets (`WP_APP_USER` etc.) were never created either (its every scheduled run since 2026-08-20 fails at `Missing required env: WP_APP_USER` in ~15s). One Phase-1 human-gate visit creates both. WC consumer keys exist but scope to `wc/v3` only.

## Existing WP pages (34, all `publish`) — target-mapping candidates

`home(4)`, `about(47)`, `contact-me(5)`, `events(20)`, `media(10)`, `press-kit(608)`, `shop(1847)`, `cart(1848)`, `checkout(1849)`, `my-account(1850)`, `solo-acoustic(2931)`, `full-band(2939)`, `band(2946)`, `sample-set-list(3666)`, `tickets-checkout(3547)`, `tickets-order(3548)`, `collabs(3742)`, `connect(3750)`, `newsletter-signup(3782)`, `kindred-spirits(4378)`, `shadows-of-a-ghost-town(4350)`, `songs-from-the-sofa(4386)`, `songs-from-the-sofa-2(4395)`, `breaker-breaker(4403)`, `aint-going-back(4411)`, `fyc-kindred-spirits-meghan-clarisse(4566)`, `reviews-shadows-of-a-ghost-town(5134)`, `kindred-spirits-review(5339)`, `photos(5520)`, `videos(5560)`, `music(5562)`, `mail(6060)`, `subscribe(6073)`, `an-intimate-songwriting-workshop…(5590)`

## Classification rule used below

- **Content** — editorial material Meg owns: prose, quotes, bios, titles, image sets, links to her profiles, per-release data. → migrates to WP.
- **Interface** — functional microcopy that is part of the designed UI, not editorial: form labels, validation and error messages, empty/loading states, button labels, tab names, cart copy, a11y labels. → **recommended to stay in code** (editing it can silently break accessibility, layout, or the checkout flow). Listed per route so the gate can overrule any line item.
- Rows marked **WP-already** need no migration — verify only (contract §1.3).

Migration actions: `A-field` = new ACF field on the named WP page · `A-media` = upload into WP media library + ACF image/gallery field · `WP-verify` = already WP-driven, verify parity only · `stays-code` = interface microcopy or design element, no migration (gate can overrule) · `env` = configuration, not content.

---

## Route: `/` (home)

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| Hero backdrop photo (`meghan-hero.jpg`, also the bg of every route + OG image) | `public/images/hero/meghan-hero.jpg` | `home` page — ACF image field `hero_photo` (media library) | A-media |
| Shows section — all show data (title, date, time, venue, city, links) | WP TEC `tribe/events/v1` (`src/lib/api/events.ts:11`) | — | WP-verify |
| Shows tab labels, search, empty states, loading, "Add to calendar", "See all dates" | `src/components/ShowsSection/ShowsSection.tsx:25-48,278-386` | — | stays-code (interface) |
| Bio ¶1–3 (Liner Notes, drop-cap) | `src/config/bio.ts:7-9` | `home` page — `bio_paragraph_1..3` | A-field |
| Pull-quote + attribution ("Music with country roots…" / "~ Meghan Clarisse") | `src/components/LinerNotes/LinerNotes.tsx:31-34` | `home` page — `pull_quote`, `pull_quote_attribution` | A-field |
| Recognition timeline (5 entries: years, org, detail) | `src/config/recognition.ts:15-37` | `home` page — recognition rows | A-field (repeat-capable, see field design) |
| "Recognition" heading, section labels (Liner Notes/Instastar/EPK/Latest Videos/The Mailing List/Discography) | components, e.g. `LinerNotes.tsx:16` | — | stays-code (interface; ★★★ labels are the design system) |
| Instagram caption "Follow along between shows —" + handle | `Instagram.tsx:84-94` + `src/config/social.ts:9-10` | `home` page — `instagram_caption`, `instagram_handle` | A-field |
| Instagram feed posts | Behold (`NEXT_PUBLIC_BEHOLD_FEED_ID`, currently unset → follow card) | — | env / external |
| Newsletter headline "Postcards from the road." + blurb + birthday hint | `Newsletter.tsx:93-98,161` | `home` page — `newsletter_headline`, `newsletter_blurb`, `newsletter_birthday_note` | A-field |
| Newsletter field labels, placeholders, validation, success/error copy, Mailchimp endpoint | `Newsletter.tsx:11-13,57-85,103-182` | — | stays-code (interface + service config) |
| EPK cards ×3 (title, description, href) — same data as `/epk` | `src/config/epk.ts:18-33` | `press-kit` page (canonical; home reuses) | A-field |
| Latest Videos — YouTube IDs (primary + 9 seeds), channel ID/URL | `src/config/videos.ts:14-33` | `videos` page — featured video URL (the ACF field the code already reads) + video list | A-field |
| Latest Videos — titles/authors/thumbnails | YouTube RSS/oEmbed | — | external (verify only) |
| Discography registry (4 releases: title, year, type, links, page/product slugs) — same data as `/music`, `/epk` | `src/config/discography.ts:34-71` | `music` page — releases rows (canonical registry) | A-field |
| Discography artist-level links (Spotify/Apple/Amazon/Buy) | `src/config/discography.ts:35-38` | `music` page — `artist_spotify`, `artist_apple`, `artist_amazon` | A-field |
| Release cover art | WP page featured image → Woo product image (browser resolve) | — | WP-verify |
| Footer social URLs (FB/IG/YouTube) | `src/config/social.ts:10-12` | `home` page — `facebook_url`, `instagram_url`, `youtube_url` | A-field |
| Footer "Request A Gig" → `admin.megcmusic.com/contact-me/` | `SiteFooter.tsx:13` | — | stays-code, **but retarget to `/booking` is a pre-existing oddity — flag to Levi (external WP link where an internal route exists)** |
| Footer "BOOK ME" watermark, copyright line, icon labels | `SiteFooter.tsx:19-59` | — | stays-code (design; copyright year should become computed — separate one-line fix, flagged) |
| Nav labels/hrefs, mobile menu | `src/components/Nav/navItems.ts:8-17` | — | stays-code (contract: nav stays as shipped) |
| Site metadata (title "Meghan Clarisse Cave", description) | `src/app/layout.tsx:21-26` | `home` page — `meta_title`, `meta_description` | A-field |
| OG tags on `/` | **absent** (no openGraph anywhere except FYC live page) | — | out of scope (no change to current content; noted as post-contract improvement) |

## Route: `/music`

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| H1 "Music" + lede "Every release, in one place —…" | `src/app/music/page.tsx:69-73` | `music` page — `page_lede` (H1 stays code) | A-field (lede) / stays-code (H1) |
| Liner Notes intro prose | **WP-already** — `music` page body ¶s (`page.tsx:82-86`) | — | WP-verify |
| Discography rows + links | `src/config/discography.ts` (see home) | `music` page releases rows | A-field |
| Singles list (membership + per-single year/type/title) | `src/config/releases.ts:51-64,73` | `music` page — releases rows gain `is_single` / kind flag (one registry, not two) | A-field |
| Live Formats ×2 (label + blurb) | `src/config/formats.ts:14-25` | `solo-acoustic`(2931) / `full-band`(2939) pages — `format_label`, `format_blurb` (photos already come from these pages) | A-field |
| Format photos | **WP-already** — first image of `solo-acoustic`/`full-band` page bodies | — | WP-verify |
| Work With Me — 2 groups (heading, blurb, 3 offerings each) + Cave Crew URL | `src/config/collaborate.ts:7,16-33` | `collabs` page (3742) — group fields + `cave_crew_url` | A-field |
| CTAs "Book or collaborate" / "Join the Cave Crew" labels | `page.tsx:160-170` | — | stays-code (interface) |
| Route metadata (title/description) | `page.tsx:26-28` | `music` page — `meta_title`, `meta_description` | A-field |

## Route: `/music/[slug]` (5 releases)

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| Slug list / static params | `src/config/releases.ts:26-65` | `music` page releases rows (each row names its WP page + product) | A-field |
| Release year/type/title | `src/config/releases.ts` | releases rows | A-field |
| "About the Record" body prose | **WP-already** — release's WP page body via `wpSlug` | — | WP-verify (note: `songs-from-the-sofa` cover uses WP page `songs-from-the-sofa` but body uses `songs-from-the-sofa-2` — two WP pages for one release; unify in the registry row, flag to Levi) |
| Lyric/credit sheets (images from WP body) | **WP-already** | — | WP-verify |
| Reviews (quote/accolade, source, href) — 3 entries across 2 releases | `src/config/reviews.ts:20-39` | each release's own WP page — review rows | A-field |
| Streaming links (per-release override slots, currently all artist-level) | `src/config/releases.ts:22-23` fallback `discography.ts:35-36` | releases rows — optional `spotify_url`, `apple_url` | A-field |
| Cover art | **WP-already** (featured image → product image) | — | WP-verify |
| Section headings, helper copy, back link, placeholders | `ReleaseBody.tsx`, `HeroCover.tsx`, `page.tsx` | — | stays-code (interface) |
| Route metadata (templated from release title/year) | `page.tsx:41-42` | templated from releases rows | A-field (via registry) |

## Route: `/media`

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| H1 "Media" + lede | `src/app/media/page.tsx:59-63` | `media` page (10) — `page_lede` | A-field (lede) / stays-code (H1) |
| Videos (featured override + curated list + extra embeds) | seeds `src/config/videos.ts` + **WP-already** (`videos` page ACF `featured_video_url` + body embeds, browser-side) | `videos` page — `featured_video_url` + video list rows (replaces the seed list) | A-field |
| Photo gallery (all images + alts) | **WP-already** — `photos` page body gallery | — | WP-verify |
| Photos empty-state copy + gallery link, lightbox labels | `PhotoGrid.tsx:97-185` | — | stays-code (interface) |
| Route metadata | `page.tsx:15-17` | `media` page — `meta_title`, `meta_description` | A-field |

## Route: `/poetry`

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| Book title, subtitle, lede, body ¶1-2, CTA note, buy href | `src/config/poetry.ts:8-19` | **new WP page `site-poetry`** (no WP page exists; created as Meg's editing surface — not a new public page) | A-field |
| Book cover | **WP-already** — Woo product `secrets-from-a-songbird` featured image | — | WP-verify |
| Section heading "Inside the Pages", CTA labels, placeholder | `page.tsx:37-67` | — | stays-code (interface) |
| Route metadata | `page.tsx:12-14` | `site-poetry` — `meta_title`, `meta_description` | A-field |

## Route: `/epk`

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| H1, header lede, CTA labels | `src/app/epk/page.tsx:82-88` | `press-kit` page — `page_lede` (H1/CTAs stay code) | A-field / stays-code |
| Bio ¶1-3 + pull-quote | `src/config/bio.ts` + `page.tsx:111-114` | `home` page bio fields (single source; EPK reuses) | A-field |
| Facts (Based / Sound / Formats / Played) | `page.tsx:30-33` | `press-kit` page — fact fields | A-field |
| EPK kit rows ×3 (title, description, href; two are `null` → "Coming soon") | `src/config/epk.ts:18-33` | `press-kit` page — kit rows (file field so Meg can attach the PDFs herself when ready) | A-field |
| Dynamic downloadable assets | **WP-already** — parsed from `press-kit` page body anchors | — | WP-verify |
| Press items ×4 (outlet, title, URL) | `src/config/press.ts:18-41` | `press-kit` page — press rows | A-field |
| Discography block | shared registry (see `/music`) | `music` page releases rows | A-field |
| Sample Set List (groups + songs) | **WP-already** — `sample-set-list` page body | — | WP-verify |
| Set-list intro prose, resources prose | `page.tsx:178-181,192-197` | `press-kit` page — `set_list_intro`, `resources_note` | A-field |
| "Hi-res photos" href (`{WP}/photos/`) | `page.tsx:38` | — | stays-code |
| Route metadata | `page.tsx:23-25` | `press-kit` — `meta_title`, `meta_description` | A-field |

## Route: `/booking`

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| H1 "Request a Gig" + header lede + intro prose | `src/app/booking/page.tsx:44-62` | `contact-me` page (5) — `page_lede`, `intro` | A-field (H1 stays code) |
| "What to include" items ×4 | `page.tsx:13-16` | `contact-me` — include rows | A-field |
| Facts (Formats / Based / Plays) | `page.tsx:21-23` | `contact-me` — fact fields | A-field |
| Form labels, placeholders, validation, success/error copy, honeypot | `BookingForm.tsx`, `api/booking/route.ts:50-57` | — | stays-code (interface; validation copy is contract-critical UX) |
| Destination inbox | `BOOKING_TO` env → Gmail | — | env |
| Route metadata | `page.tsx:6-8` | `contact-me` — `meta_title`, `meta_description` | A-field |

## Routes: `/fyc/shadows-of-a-ghost-town` (live), `/fyc/kindred-spirits` (archived)

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| Live: album, category, cycle, releaseMeta, pitch ¶1-3 | `src/config/fyc.ts:102-111` | `shadows-of-a-ghost-town` page (4350 — the original FYC page) — campaign fields | A-field |
| Live: quotes ×3 (text, source, sourceDetail) | `fyc.ts:114-128` | same page — quote rows | A-field |
| Live: videos ×6 (YouTube ID + title) | `fyc.ts:131-136` | same page — video rows | A-field |
| Live: 11 lyric sheets + per-song alts (track list) | build-fetched to `public/images/fyc` (`scripts/fetch-fyc-assets.mjs`) — **not committed** | same page — lyric-sheet gallery **uploaded into the WP media library** (alts carried per image; the images already live in WP uploads `2025/07/*` — re-linked, not re-uploaded, if identical) | A-media |
| Live: album link | `fyc.ts:139` | campaign fields | A-field |
| Live: metadata + OG block + canonical | `page.tsx:15-26` | templated from campaign fields | A-field (via fields) |
| Archived: album, category, cycle, pitch ¶, video, album link | `fyc.ts:143-154` | `fyc-kindred-spirits-meghan-clarisse` page (4566) — same field group | A-field |
| Archived: noindex flag | `page.tsx:17` | — | stays-code (per 2026-08-28 ADR, stands) |
| Streaming links ×3 (both pages) | `discography.ts:35-37` | `music` page artist links (single source) | A-field |
| Eyebrows, section headings, "More" link labels | page files | — | stays-code (interface) |
| `/fyc` redirect + nav item | `next.config.ts`, `navItems.ts` | — | stays-code (contract §6: stays as shipped) |
| `FYC_CURRENT_SLUG` + campaign slug registry | `fyc.ts:99,158-160` | — | stays-code (retargeting a campaign is a studio task per owner decision 4) |

## Routes: `/shows`, `/shop`, `/shop/[slug]` (verify, don't rebuild)

| Element | Current source | Target WP home | Action |
|---|---|---|---|
| All show data | WP TEC | — | WP-verify |
| All product data (name, price, stock, images, descriptions) | WP Woo `wc/v3` + `wc/store/v1` | — | WP-verify |
| `/shows` H1 + lede | `src/app/shows/page.tsx:64-67` | `events` page (20) — `page_lede` | A-field (lede) / stays-code (H1) |
| `/shop` H1 "Merch & Music" + lede | `src/app/shop/page.tsx:47-51` | `shop` page (1847) — `page_lede` | A-field (lede) / stays-code (H1) |
| Route metadata (both) | page files | `events` / `shop` pages — meta fields | A-field |
| Empty/error/loading states, cart drawer copy, checkout notices, calendar widget | `ShowsSection.tsx`, `ProductGrid.tsx`, `ProductDetail.tsx`, `CartDrawer.tsx`, `AddToCart.tsx` | — | stays-code (interface; cart/checkout excluded by owner decision 3) |
| Checkout hand-off flow | `src/lib/checkout.ts` | — | out of scope (owner decision 3) |

## Route: `/megs-playbook`

Out of scope (owner decision 3 — an app, stays as is).

---

## Notable findings surfaced by the audit (for the gate)

1. **Vercel cannot read `/wp-json`** (verified in production HTML) — the "build-time WP read" must run from a context that reaches WP; mechanism decided by the GHA probe result. See `acf-field-design.md` §Publish-pipeline consequence.
2. **The FYC lyric sheets are not committed and not in `public/`** — every Vercel build re-fetches them from WP uploads/Photon. Phase 2 formalizes this: WP media library becomes the source, same build-time fetch pattern.
3. **An ACF reader already shipped with no producer** — `wordpress-browser.ts` requests `acf.featured_video_url` on the `videos` page; ACF was never installed. Phase 1 makes that field real.
4. **Show-pipeline GHA secrets were never created** (`WP_APP_USER` missing; every scheduled run fails). Same human-gate visit that installs ACF should create the application password both consumers need.
5. **`songs-from-the-sofa` release uses two different WP pages** (cover vs body). Unify in the registry row at Phase 3; confirm which page is canonical with Levi/Meg.
6. **Interface-vs-content boundary** is a proposed line, not contract text — every `stays-code` row above is open to being overruled at the gate.
7. **No route except the live FYC page has OG tags**; adding them is an improvement, not parity — parked unless Levi wants it in scope.
8. **Footer "Request A Gig" links the old WP contact page** instead of `/booking` — pre-existing; one-line fix if wanted (parity says leave it).
