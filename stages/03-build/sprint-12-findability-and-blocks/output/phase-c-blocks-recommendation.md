# Phase C — Should Meg get her own content blocks? (recommendation only)

Date: 2026-09-09 · Status: **recommendation — no code, no plugin change**. Sprint 11 decision 1.4 ("edit existing surfaces only… no generic page-builder template") stays in force until Levi writes the superseding entry.

## Precondition, verified

The install runs **Secure Custom Fields 6.9.5** (WordPress.org fork; ACF 6.8.9 is installed but inactive). SCF ships the former Pro field types — Repeater is already in use on five field groups here, and the 6.9.x changelog names Flexible Content fixes ("Flexible Content disabled layouts now work correctly", "nested Flexible Content fields"). So **Flexible Content is available without buying anything**. Verified from the plugins screen and the plugin's published readme, not assumed.

## What Meg can and cannot do today

Every word and photo a visitor sees is hers to edit (Sprint 11). What she cannot do is change *which sections* a page has, or *add a section* that the design did not anticipate. When a need arrives that has no field — a tour announcement above the shows, a second pull quote, a sponsor line, a video with a paragraph beside it — it is a studio task. That is the question here: is that gap worth a block system, and which one?

## Option 1 — SCF Flexible Content, scoped to specific pages

**Shape.** One Flexible Content field per host page, offering a bounded set of hand-built layouts. Meg adds, removes and reorders blocks; each block type is a designed component that already exists in the token system; parity discipline holds per block, not per page.

**Block types worth building — named from what her pages actually need**, not a generic kit:

| Block | Where the need shows up | Component that already exists |
|---|---|---|
| Photo + text | Home bio, EPK intro, release pages (art + paragraphs) | the bio/intro pairings |
| Pull quote | Home (one today), release pages' press quotes, FYC pitch | `pull_quote` on Home |
| Video embed | FYC videos, a release page with a single video | the FYC video row / `VideosGallery` facade |
| Announcement / callout | Nothing today — the tour-date or award line that currently has no home | the ★★★ section-label pattern + one paragraph |
| Link row | Connect-style hub, release streaming links | the release links row |

Five types. Anything beyond that is a page builder wearing a field group.

**Where it goes.** Not everywhere. A flexible zone on **Home** (between Recognition and the newsletter — the place a "what's new" lands) and on **the release pages** (below the fixed header, where campaigns want a quote or a video). Media does not need one: it is two lists. EPK is a press document and should stay fixed.

**Cost, honestly.**
- Field groups: one new group per host (2), each a plugin change → **each is a plugin re-upload through the wp-admin gate** (README steps 2 + 6). Batch them: one re-upload.
- Components: 5 block components, each a CSS-Module-and-tokens build with five interaction states where interactive, reduced-motion path, a11y spec (`sc-a11y-spec`) at Gate 2.
- Fetcher: `scripts/fetch-wp-content.mjs` needs nothing new — Flexible Content arrives inside `acf` as an array of `{ acf_fc_layout, …fields }` rows. `home-content.ts` and `release`-side readers **extend** their shape with an optional `blocks: Block[]` (learning #60 — superset, never a swap). A page with no blocks renders exactly as today, which is the parity baseline.
- PRs: 1 (field groups + readers + a `BlockRenderer` that maps `acf_fc_layout` → component, renders nothing for an unknown layout and logs it) + 1 per block type (5) + 1 parity proof = **7 PRs**, each with its screenshot-pair proof against a rebuilt baseline.
- Phase-0-style audit first: for Home and each release page, which current sections **become** blocks (candidates: the pull quote, the FYC quotes and videos) and which **stay fixed** (hero, shows, discography, singles, newsletter, footer — anything with a data source other than the page). The audit is the artifact Levi approves before a field is drawn.
- Guide: section 02 gains one row per host page ("and the Blocks area, where you can add…") and a new short section 04 on adding, moving and removing a block. PDF re-rendered.
- Turn budget, scaled from Sprint 11's per-surface PRs: roughly 3 sprints of the size this one is.

**Risk.** The gate is the same one Sprint 11 cleared: a plugin re-upload on a fragile Bluehost install. Mitigation is the same: PHP-8.3-clean JSON-only change, `wp-plugin-lint.yml`, no admin hooks. A block Meg leaves half-filled must render as "absent by content", never blank — the fetcher's existing rule.

## Option 2 — the narrower version (recommended)

**Home only, one flexible zone, three block types** (announcement, pull quote, video embed). Release pages keep their fixed fields; if a campaign needs more, it is still a studio task, as decision 1.4 says today.

Why this is the right size: the one recurring need with evidence behind it is a **timely announcement on Home** — award nominations (she added five Recognition rows on 2026-09-08), a release, a tour date — and the current answer is "edit the Recognition list", which is not what that list is for. A single zone answers that without turning the site into a layout tool.

Cost: 1 field group (one re-upload), 3 components, **4 PRs** (zone + reader + renderer; announcement; pull quote; video; parity proof folded into each). Audit first, scoped to Home. Guide: one row and a half-page. About one sprint.

Parity baseline: Home with an empty zone renders byte-identically to today — that is the acceptance test for the first PR before any block exists.

## Option 3 — a third-party page builder (Elementor, WPBakery)

**Not recommended**, and plainly: it breaks the studio's no-page-builder default and Sprint 11's premise. What it puts at risk:
- **Pixel parity and token control** — a builder emits its own markup and inline styles; every block Meg drags is outside `token-map.css`, and the headless front-end would have to render builder HTML it does not control.
- **The guide's promise** — "nothing you type can break how the site looks" stops being true the day a builder is installed.
- **The Bluehost history** — the 2026-08-27 outage was two abandoned plugins fataling on admin hooks. A page builder is the largest, most hook-heavy class of plugin there is, on an install whose auto-updates have already left it broken for months at a time.
- **The architecture** — Next renders WP data through typed readers. Builder output is opaque HTML; the choice becomes "iframe it" or "reimplement the builder's renderer", both of which are worse than either SCF option.

## Recommendation

**Option 2.** One flexible zone on Home with three block types, behind a Phase-0-style audit Levi approves. Revisit Option 1's release-page zone only after the Home zone has been used for a real announcement — evidence, not anticipation.

Then stop: this supersedes nothing until Levi writes the entry that supersedes decision 1.4.
