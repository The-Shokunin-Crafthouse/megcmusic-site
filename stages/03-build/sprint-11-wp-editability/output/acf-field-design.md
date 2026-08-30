# Sprint 11 — Phase 0 ACF Field-Group Design

> Companion to `content-inventory.md`. Presented together at the Phase-0 gate. Field groups ship as local JSON registered by the `/wp-plugin/megc-site-content/` plugin (Phase 1), exposed to REST.

## Gate question 1 — the plugin itself (decision needed before Phase 1)

The contract names **ACF (free)** and asks for gallery + repeater fields. Verified 2026-08-29: those field types are **PRO-only** in Advanced Custom Fields (free ACF has no repeater, no gallery, no options page; ACF PRO is $149/yr). The wp.org fork **Secure Custom Fields (SCF)** ships the PRO feature set — repeater, gallery, flexible content, options pages — free, hosted on wordpress.org with the normal auto-update path, and keeps ACF's field-group JSON format and REST exposure.

| Option | Cost | Repeater/gallery | Notes |
|---|---|---|---|
| **Secure Custom Fields (recommended)** | $0 | ✅ | wp.org-hosted; ACF-compatible JSON + API; the standard path on a hosted install. Fork governance is the only risk — mitigated by our field definitions living in repo JSON (portable to ACF PRO in minutes if SCF ever degrades). |
| ACF PRO | $149/yr | ✅ | Canonical vendor; a license and account to manage. |
| ACF free + fixed slots | $0 | ❌ | 11 numbered image fields, `quote_1..3`, etc. Ugly for Meg, rigid (a 12-track album breaks the pattern). Not recommended. |

The design below is written against the SCF/ACF-PRO feature set. If Levi picks free ACF, every repeater/gallery collapses to fixed slots and the design gets re-presented.

Sources: [WP Tavern — SCF ships with ACF Pro features](https://wptavern.com/wordpress-org-releases-new-secure-custom-fields-plugin-with-acf-pro-features), [ACF PRO](https://www.advancedcustomfields.com/pro/).

## Publish-pipeline consequence (verified 2026-08-29, decision needed at gate)

- Vercel's builders/runtime **cannot read `/wp-json`** (proved from production ISR HTML — every server-side WP section is empty and browser-filled today).
- The GitHub Actions runner **reads `/wp-json` cleanly** (probe run 33282133387: 200 on core + TEC reads, WP-core 401 JSON on unauthenticated POST, 200 on uploads).
- `deploy.yml` currently runs `vercel deploy --prod` — the build executes on Vercel's infra, where WP is unreachable.

**Proposed mechanism (gate question 2):** move the build onto the GHA runner — `vercel pull` + `vercel build` + `vercel deploy --prebuilt --prod` (same change in `preview-deploy.yml`). Then every Phase-3 "build-time WP/ACF REST read" runs where WP answers. Migrated content surfaces become **fully static at build** (no ISR revalidate for ACF content — a content change triggers a rebuild via the WP → `repository_dispatch` ping, which is the contract's publish model anyway, plus the nightly self-heal rebuild). Shows/shop keep their existing ISR + browser-fallback pattern untouched (verify-only surfaces). Fail-loudly invariant: the GHA build step that reads WP exits non-zero with a named cause on fetch failure; the previous deploy stays live.

Alternative (not recommended): a GHA pre-step snapshots WP content to JSON and Vercel builds from the snapshot — more moving parts and a known drift class (studio learning #69).

## Design conventions

- One field group per editing surface, attached to the named existing WP page (or the one new admin-surface page, `site-poetry`). The WP page IS Meg's editing UI; the Next route renders the fields.
- Labels are plain language; every field carries help text ("instructions") written for Meg. No jargon, no HTML asked of her.
- Content that appears on several routes lives **once**, on its canonical page; the help text names everywhere it shows.
- Field names are `snake_case`, stable, and are the REST contract.
- Interface microcopy (buttons, forms, empty states, cart) stays in code per the inventory's classification — every such row is listed there and can be overruled at the gate.
- All groups: `show_in_rest: true`; read via `?acf_format=standard`.

---

## Group 1 — "Home Page" → WP page `home` (ID 4)

| Field | Type | Label | Help text for Meg |
|---|---|---|---|
| `bio_paragraph_1` | textarea | Your bio — first paragraph | Opens your Liner Notes on the home page and "The Story" on the Press Kit page. The first letter becomes the big decorative capital. |
| `bio_paragraph_2` | textarea | Your bio — second paragraph | Middle of your bio. Mention releases by name and year — they read like liner notes. |
| `bio_paragraph_3` | textarea | Your bio — third paragraph | Closes your bio (the volunteering paragraph today). |
| `pull_quote` | text | Pull quote | The short quote in the pink-bordered block ("Music with country roots and cowgirl boots."). Shown on Home and the Press Kit page. |
| `pull_quote_attribution` | text | Quote credit | Who said it — shows as "~ Meghan Clarisse" today. |
| `recognition` | repeater | Recognition timeline | Awards and memberships in the gold sidebar, newest first. Add a row per honor. |
| — `years` | text | Years | e.g. "2026" or "2019 – Present". |
| — `honor` | text | Honor | e.g. "Josie Music Award Nominee". |
| — `detail` | text | Detail | The smaller line, e.g. "Album of the Year (Folk/Americana)". |
| `instagram_caption` | text | Instagram caption | The line under your Instagram grid ("Follow along between shows —"). Your handle is added after it automatically. |
| `instagram_handle` | text | Instagram handle | Without the @. Changes the link and the @name shown. |
| `newsletter_headline` | text | Mailing-list headline | "Postcards from the road." today. |
| `newsletter_blurb` | textarea | Mailing-list blurb | The sentence under the headline — what people get and how often. |
| `newsletter_birthday_note` | text | Birthday note | Shown under the birthday box on the signup form. |
| `hero_photo` | image | Site photo | The big background photo used across the site. Replacing it changes every page — check with Levi before swapping. |
| `facebook_url` / `instagram_url` / `youtube_url` | url ×3 | Facebook / Instagram / YouTube | The footer icons link here. |
| `meta_title` | text | Browser-tab title | What Google and the browser tab show for the home page. |
| `meta_description` | textarea | Search description | The sentence Google shows under your site name. One or two sentences. |

## Group 2 — "Music Page & Releases" → WP page `music` (ID 5562)

| Field | Type | Label | Help text |
|---|---|---|---|
| `page_lede` | text | Page intro line | The sentence under the big "Music" heading. |
| `releases` | repeater | Your releases | One row per release, newest first. Powers the Discography on Home, Music, and Press Kit, the Singles list, and each release's own page. |
| — `title` | text | Title | Release title as it should appear everywhere. |
| — `year` | text | Year | e.g. "2025". |
| — `kind` | select (LP / EP / Single) | Kind | Albums and EPs go in the Discography; Singles go in the Singles list. |
| — `release_page` | post object (page) | Its page on this dashboard | The WordPress page whose text and lyric images make up the release's "About the Record" page. |
| — `product` | post object (product) | Shop item | The shop product for the "Buy" button. Leave empty if it isn't sold. |
| — `spotify_url` / `apple_url` | url ×2 | Spotify / Apple links | The release's own streaming links. Leave empty to use your artist profile links below. |
| `artist_spotify` / `artist_apple` / `artist_amazon` | url ×3 | Your artist profiles | Used wherever a release doesn't have its own link, and on the FYC "Listen" buttons. |
| `meta_title` / `meta_description` | text / textarea | Browser-tab title / Search description | As on Home. |

Liner-notes prose on `/music` stays what it already is: this page's own body text.

## Group 3 — "Release Reviews" → the five release pages (4350, 4378, 4386/4395, 4403, 4411)

| Field | Type | Label | Help text |
|---|---|---|---|
| `reviews` | repeater | What people are saying | Press quotes or chart placements for this record. Shown on the release's page. |
| — `quote_or_accolade` | textarea | Quote or accolade | Either a review quote or a placement like "Top 10 — October 2025". |
| — `source` | text | Source | Outlet or reviewer, e.g. "The Alternate Root". |
| — `link` | url | Link | Where the quote lives. Optional. |

Release body prose + lyric-sheet images stay the page's own content (already editable today).

## Group 4 — "Live Format" → pages `solo-acoustic` (2931) and `full-band` (2939)

| Field | Type | Label | Help text |
|---|---|---|---|
| `format_label` | text | Format name | "Solo Acoustic" / "Full Band" — shown on the Music page. |
| `format_blurb` | textarea | One-line description | The sentence under the format name. |

The format photo stays the first image of this page's content (as today).

## Group 5 — "Work With Me" → WP page `collabs` (ID 3742)

| Field | Type | Label | Help text |
|---|---|---|---|
| `collab_groups` | repeater | Audience groups | Two today: fans & community, business & brands. |
| — `heading` | text | Group heading | e.g. "For fans & community". |
| — `blurb` | text | Group blurb | The short line under the heading. |
| — `offerings` | repeater | Offerings | The starred list. |
| —— `title` | text | Offering | e.g. "House concerts". |
| —— `detail` | text | Detail | The smaller explanatory line. |
| `cave_crew_url` | url | Cave Crew link | Where "Join the Cave Crew" goes (the Facebook group today). |

## Group 6 — "Media Page" → WP page `media` (ID 10)

`page_lede` (text) · `meta_title` · `meta_description` — as elsewhere. Photos stay the `photos` page's gallery; videos come from Group 7.

## Group 7 — "Videos" → WP page `videos` (ID 5560)

| Field | Type | Label | Help text |
|---|---|---|---|
| `featured_video_url` | url | Featured video | Paste a YouTube link to pin it as the big player on Home and Media. (The site already looks for this exact field.) |
| `video_list` | repeater | Video list | The playlist order on Home and Media. Paste YouTube links; titles come from YouTube automatically. |
| — `youtube_url` | url | YouTube link | The full watch URL. |

## Group 8 — "Press Kit" → WP page `press-kit` (ID 608)

| Field | Type | Label | Help text |
|---|---|---|---|
| `page_lede` | text | Page intro line | Under the "Electronic Press Kit" heading. |
| `fact_based` / `fact_sound` / `fact_formats` / `fact_played` | text ×4 | Quick facts | The four fact chips (Based / Sound / Formats / Played). |
| `kit_items` | repeater | Press-kit downloads | The download rows on Home and the EPK page. |
| — `title` | text | Name | e.g. "Solo Acoustic EPK". |
| — `description` | text | One-liner | What's inside. |
| — `file` | file | The file | Upload the PDF here when it's ready; until then the row shows "Coming soon". |
| — `link` | url | Or a link | Use instead of a file for things that live elsewhere (the Sample Set List page today). |
| `press_items` | repeater | Press coverage | The "What People Are Saying" links on the EPK page. |
| — `outlet` / `title` / `url` | text / text / url | Outlet / Piece / Link | — |
| `set_list_intro` | text | Set-list intro | The line above the sample set list. |
| `resources_note` | textarea | Photos & booking note | The paragraph in the closing section. |
| `meta_title` / `meta_description` | — | — | As elsewhere. |

Bio and pull-quote come from the Home page group (single source). The set list itself stays the `sample-set-list` page body; extra downloads keep coming from this page's body links.

## Group 9 — "Booking Page" → WP page `contact-me` (ID 5)

| Field | Type | Label | Help text |
|---|---|---|---|
| `page_lede` | textarea | Page intro | Under "Request a Gig". |
| `intro` | textarea | How booking works | The "booked personally — no agency" paragraph. |
| `include_items` | repeater → `item` (text) | What to include | The starred checklist beside the form. |
| `fact_formats` / `fact_based` / `fact_plays` | text ×3 | Quick facts | The three fact chips. |
| `meta_title` / `meta_description` | — | — | As elsewhere. |

The form itself (labels, messages) is part of the site's plumbing and stays fixed.

## Group 10 — "Poetry Page" → **new** WP page `site-poetry` (created in Phase 1; an editing surface, not a public WP page)

| Field | Type | Label | Help text |
|---|---|---|---|
| `book_title` | text | Book title | "Secrets From a Songbird". |
| `subtitle` | text | Subtitle | "A collection of poetry by Meghan Clarisse". |
| `lede` | textarea | Opening line | The italic line at the top. |
| `body_paragraphs` | repeater → `paragraph` (textarea) | About the book | The "Inside the Pages" paragraphs. |
| `cta_note` | text | Buy-button note | "A first edition, straight from Meghan." |
| `meta_title` / `meta_description` | — | — | As elsewhere. |

Cover image stays the shop product's photo (as today).

## Group 11 — "FYC Campaign" → pages `shadows-of-a-ghost-town` (4350) and `fyc-kindred-spirits-meghan-clarisse` (4566)

| Field | Type | Label | Help text |
|---|---|---|---|
| `album_title` | text | Album | The big heading. |
| `category_line` | text | Category | e.g. "Contemporary Country Album". |
| `cycle_line` | text | Awards cycle | e.g. "For Your Grammy Consideration · Country & American Roots Music". |
| `release_meta` | text | Release line | e.g. "Released September 26, 2025". Optional. |
| `pitch_paragraphs` | repeater → `paragraph` (textarea) | About the album | The pitch, paragraph by paragraph. |
| `quotes` | repeater | Press quotes | The "What People Are Saying" cards. |
| — `quote` / `source` / `source_detail` | textarea / text / text | Quote / Who / Where | — |
| `videos` | repeater | Watch-live videos | Performance links, in order. |
| — `youtube_url` / `title` | url / text | YouTube link / Caption | Caption shows under the thumbnail, e.g. "Strong — Colorado & Company". |
| `lyric_sheets` | gallery | Lyric sheets | The lyric images, in track order. Each image's alt text (its description for screen readers) is edited on the image itself in the media library — the per-song alts are filled in during migration. |
| `album_link` | page link | Album page | Where "The album" points. |

The 11 Shadows lyric PNGs already exist in WP's media library (`uploads/2025/07/…`) — Phase 2 re-links them into the gallery (with the per-song alts from PR #79) rather than re-uploading. Live/archived framing, noindex on the archive, `/fyc` redirect, and nav stay in code as shipped.

## Group 12 — "Shows Page" → WP page `events` (ID 20), and "Shop Page" → WP page `shop` (ID 1847)

Each: `page_lede` (text) · `meta_title` · `meta_description`. Show data (The Events Calendar) and products (WooCommerce) are untouched — Meg keeps managing them exactly as today.

---

## Gate questions (all of Phase 0's asks in one list)

1. **Plugin:** Secure Custom Fields (recommended, $0) vs ACF PRO ($149/yr) vs free ACF with fixed slots?
2. **Pipeline:** approve moving builds to the GHA runner (`vercel build` + `--prebuilt`) so build-time WP reads work — with migrated surfaces going static-at-build (rebuild-on-save + nightly)?
3. **Interface-vs-content boundary:** approve the `stays-code` classification in `content-inventory.md` (forms, empty states, buttons, cart, section labels stay code)? Any line to flip?
4. **Meta titles/descriptions** included as editable fields per page — in or out?
5. **`songs-from-the-sofa`** uses two WP pages (cover from `songs-from-the-sofa`, body from `songs-from-the-sofa-2`) — which is canonical?
6. Keep or delete the temporary `wp-probe.yml` diagnostic workflow after the gate?
