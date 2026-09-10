# Home blocks — the Phase-0-style audit (gate artifact for the next sprint)

Date: 2026-09-10 · Follows Levi's pick of Option 2 · **Nothing here is built.** This is the table Levi approves before a field group is drawn.

## Every section on Home today, and what happens to it

Read from `src/app/page.tsx` and the Home field group (`group_megc_home.json`). "Stays fixed" means the section keeps its named fields exactly as Sprint 11 left them. "Becomes a block type" means the *pattern* is offered inside the new zone; the existing instance is not converted.

| # | Section (component) | Data source today | Verdict | Why |
|---|---|---|---|---|
| 1 | Hero + shows (`HomeScene`) | `hero_photo`; The Events Calendar | **stays fixed** | Live data and the site's opening scene; not content Meg arranges |
| 2 | Bio + pull quote (`LinerNotes`) | `bio_paragraph_1..3`, `pull_quote`, `pull_quote_attribution`, `recognition` | **stays fixed** — the pull-quote *pattern* becomes a block type | The bio is the page's spine. The pull quote is the one Home pattern she has asked for more of; offering it as a block gives her a second quote without touching the first |
| 3 | Instagram (`Instagram`) | `instagram_caption`, `instagram_handle` + live feed | **stays fixed** | Live data |
| 4 | EPK teaser (`EPK`) + `BootScene` | EPK page fields | **stays fixed** | Reads from another page; the boot scene is motion, not content |
| 5 | Videos (`Videos`) | page 5560 | **stays fixed** — the video-embed *pattern* becomes a block type | The gallery is her whole list now (2026-09-10). A single-video block lets a release or announcement carry one video without editing the playlist |
| 6 | **→ new: the Blocks zone** | `home_blocks` (Flexible Content) | **new** | Where "what's new" reads naturally — see the slot question below |
| 7 | Mailing list (`Newsletter`) | `newsletter_headline`, `newsletter_blurb`, `newsletter_birthday_note` | **stays fixed** | A form with a data source; not a content block |
| 8 | Discography (`Discography`) | Music page release list | **stays fixed** | Reads from another page |
| 9 | Singles (`Singles`) | Music page release list | **stays fixed** | Same |
| 10 | Footer (`SiteFooter`) | social URLs | **stays fixed** | Site chrome |

**The one open layout question:** where the zone sits. Recommendation: **after Instagram, before the EPK teaser** (between 3 and 4), so an announcement never separates the bio from its recognition list and still lands on the second screen at 1440. Alternative: between the EPK teaser and Videos. Levi decides.

## The three block types, with their fields

| Block (`acf_fc_layout`) | Fields | Component it derives from | Empty-state rule |
|---|---|---|---|
| `announcement` | `eyebrow` (text, e.g. "New single"), `headline` (text), `body` (textarea, optional), `link_label` + `link_url` (optional) | the ★★★ section label + one paragraph, the pull-quote type scale | no headline → the block does not render |
| `pull_quote` | `quote` (textarea), `attribution` (text) | `LinerNotes`' pull quote, extracted into a shared `PullQuote` | no quote → does not render |
| `video` | `youtube_url` (url), `caption` (text, optional) | `VideosGallery`'s facade (thumbnail + play, one iframe on play) | invalid or empty URL → does not render |

Each block is a Server Component reading typed props; `BlockRenderer` maps `acf_fc_layout` → component and renders nothing (logging the layout name at build) for an unknown one. A half-filled block renders as "absent by content", never blank — the fetcher's existing rule.

## What changes where

| Layer | Change |
|---|---|
| Plugin | `group_megc_home.json` gains a "Blocks" tab with the `home_blocks` Flexible Content field (three layouts above). **One plugin re-upload** through the wp-admin gate (README steps 2 + 6); version bump to 1.3.0; `wp-plugin-lint.yml` must pass |
| Fetcher | none — `fetch-wp-content.mjs` already writes the whole `acf` object; Flexible Content arrives as `home_blocks: [{ acf_fc_layout, … }]` |
| Reader | `home-content.ts` gains optional `blocks: HomeBlock[]` — a superset, never a swap (learning #60). Empty or absent → `[]` |
| Page | `src/app/page.tsx` mounts `<HomeBlocks />` at the agreed slot; with `[]` it renders nothing, so **Home is byte-identical to today** — the parity baseline for PR 1 |
| Components | `HomeBlocks` + `BlockRenderer`; `Announcement`, `PullQuote` (extracted), `VideoBlock` (facade reuse). Each: five states where interactive, reduced-motion path, `sc-a11y-spec` at Gate 2, tokens only, `sc-hygiene` drift 0 |
| Guide | section 02 Home row gains "and the Blocks area"; new short section on adding, moving and removing a block; PDF re-rendered |
| Tests | unit tests for the reader's block parsing (unknown layout dropped, half-filled block dropped) |

## PR plan (about one sprint)

1. Field group + reader + `HomeBlocks`/`BlockRenderer` rendering nothing — parity: Home byte-identical. *Human gate: plugin re-upload.*
2. `announcement` block.
3. `pull_quote` block (extracting the shared component; `LinerNotes` parity must hold).
4. `video` block.
5. Guide + close-out; a real announcement saved by Meg and seen live, timed (the A.2 pattern).

## Gate

Levi approves: the verdict column, the zone's slot, the three block types and their fields. Then the next sprint's contract is written from this table.
