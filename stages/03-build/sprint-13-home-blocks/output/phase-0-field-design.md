# Phase 0 — The Blocks field, as Meg will see it

Plugin `megc-site-content` 1.3.0 · `acf-json/group_megc_home.json` gains a tab. Nothing else in the group changes; every existing Home field keeps its key, name and label.

**Tab: Blocks** (last tab on the Home page, after Site Basics)

**Blocks** — button "Add a block"
> Extra pieces for the Home page — an announcement, a quote, or a video. Add as many as you like, drag to reorder, remove them when they are old. They appear between the Instagram section and the press-kit teaser. Leave this empty and Home looks exactly as it does today.

| Layout (picker label) | Field label | name | type | help text | required |
|---|---|---|---|---|---|
| **Announcement** | Small line above | `eyebrow` | text | Optional. e.g. "New single" or "Award season". | |
| | Headline | `headline` | text | What people read first. Required — a block without a headline does not show. | ✓ |
| | Text | `body` | textarea (3 rows) | Optional. A sentence or two. | |
| | Link text | `link_label` | text | Optional. e.g. "Listen now". Needs a link address too. | |
| | Link address | `link_url` | url | Optional. Where the link goes. | |
| **Pull quote** | Quote | `quote` | textarea (3 rows) | The quote itself, without quotation marks. Required. | ✓ |
| | Who said it | `attribution` | text | e.g. "Americana Highways". | |
| **Video** | YouTube link | `youtube_url` | url | Any YouTube link — watch, Shorts, or share. Required. | ✓ |
| | Caption | `caption` | text | Optional. One line under the video. | |

REST shape (what the build reads): `acf.home_blocks` is `false` while empty, otherwise `[{ "acf_fc_layout": "announcement" | "pull_quote" | "video", …fields }]` in Meg's order. `scripts/fetch-wp-content.mjs` needs no change — it already writes the whole `acf` object to `src/generated/wp-content/home.json`.

Reader rules (`src/lib/home-blocks.ts`, unit-tested): required field missing → the block is dropped; unknown layout → dropped and logged by row at build; empty → `[]`, and Home renders exactly as before.
