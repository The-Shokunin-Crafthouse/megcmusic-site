# SPRINT 16 — The front door, and the fields that feed nothing (CONTRACT)

> Filed 2026-09-17 from Levi's three-part ask after PR #147: (1) check every live page against its WordPress page and make every field count, so Meg can add, reorder and manage content with no dev work; (2) explain why she still sees the old site after signing in; (3) make the editor's Preview open the new front end. Filed **beside** Sprint 14 (still in progress); the `Current sprint:` pointer stays on Sprint 14. Branches per phase off a clean `main`.
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules; "Meg never touches code"; every content read is hers to trigger |
> | Workflow gates | `../../../../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | The audit | `output/parity-audit.md` | Every route, every section, every source; the dead-field table (§1) and the ranked gap (§3) |
> | Decision log | `decisions/decisions.md` | 2026-08-29 Sprint 11 kickoff (decisions 1–5 bind: ACF fields, rebuild on save, edit-existing-only); 2026-09-10 Home blocks supersession; 2026-09-17 front-door ADR |
> | Sprint 11 contract | `../sprint-11-wp-editability/CONTEXT.md` | Invariants §2 inherited verbatim (pixel + content parity, fail loudly, no WP core edits) |
> | Sprint 13 contract | `../sprint-13-home-blocks/CONTEXT.md` | The one existing block zone; the pattern Sprint 17 generalises |
> | Plugin | `wp-plugin/megc-site-content/` | The only WordPress-side code; re-upload is the human gate |
> | Fetchers | `scripts/fetch-wp-content.mjs`, `scripts/fetch-releases.mjs` | Where new surfaces are added (one line per surface) |
> | Readers | `src/lib/*-content.ts` | The pure-parse pattern with unit tests (`home-blocks.ts` is the model) |
> | Migration record | `scripts/wp-migrate/hardcoded-strings.json`, `migrate-content.ts` | What was written into the dead fields on 2026-09-05 — the parity oracle |
> | Guide | `docs/meg-editing-guide.html` (+ `.pdf`) | Re-render with Playwright `page.pdf` on every change |
> | Unit tests | `npm test` | Tests first, planted bug, verifier records it (learnings #230, #231) |
>
> **Turn ceiling:** 40 turns across Phases 1–2 in one session. On hitting it: open what exists as a draft PR, park with a resume note here, stop.
>
> **Phase status (2026-09-17):** 0 audit ✅ · 1 front door ✅ (#148 merged) · 2 dead fields ✅ (#149 merged, production deployed 22:20 UTC; the Shadows review row Meg added is live) · plugin 1.4.1 uploaded by Levi the same day (its `kind` default flipped old rows — corrected in Sprint 17, plugin 1.5.0) · 3 → Sprint 17 filed on Levi's "5".

---

Project: megcmusic-site · Owner: Levi · Client editor: Meghan Clarisse Cave · Date: 2026-09-17 · Status: IN PROGRESS.

**Prime directive:** every field Meg can see in her dashboard changes something on the live site, and every door out of her dashboard — View, Preview, Visit Site, the address bar — opens the live site. Until Sprint 17 lands, the *set* of sections on each page stays fixed; their *content* is hers.

## 0. Owner decisions — already made, do not reopen

1. **WordPress `home`/`siteurl` stay on `admin.megcmusic.com`** (2026-09-17 ADR). The front door is plugin hooks, not the options table.
2. **Preview opens the published live page.** A draft preview is a sprint of its own (client-rendered surfaces from a token-gated WP endpoint); recorded as an option, not planned.
3. **Commerce and ticketing stay on WordPress** (Sprint 11 §3). Cart, checkout, account, product, event and ticket pages are never redirected and never remapped.
4. **Meg's published copy is hers.** Where a WordPress field already differs from the repo string it replaces (page 4350's third review), the field wins; the difference is listed in the PR, not edited.

## 1. Invariants (Sprint 11 §2, plus)

- Pixel and content parity on every route whose *content source* moves, proven with the Sprint 11 oracle: the reader's output on the current WP snapshot equals the repo strings it replaces, asserted in a unit test, plus a rendered-text diff of the touched routes from a local build. Where Meg has since edited a field, the diff names the row.
- A build-time read fails the build loudly; nothing renders blank because a read failed. Only WordPress returning an empty field renders the empty state.
- Every fetch goes through `scripts/lib/retry.mjs` (Sprint 15).
- Extend response shapes, never swap (learning #60). `releases.json` gains `reviews` and `intro`; nothing loses a key.
- A superseded `src/config/*.ts` is deleted in the PR that replaces it, its tests carried over (Sprint 11 §6).
- Plugin changes are JSON or guarded hooks only; PHP 8.3 clean; every hook body exception-wrapped; `wp-plugin-lint.yml` green.
- Process: protected `main`, one PR per phase, ADRs appended, LEARNINGS at close, resume pointer maintained.

## 2. Phase 1 — The front door (PR `feat/wp-front-door-and-preview`)

Plugin 1.4.0: `page_link`, `preview_post_link`, `admin_bar_menu`, `template_redirect` (see the ADR and `README.md` "The front door"). Route map unit-tested in `tests/live-routes.test.php`, run by `wp-plugin-lint.yml`. Footer CTA → `/booking`. Guide §01 gains the View/Preview paragraph; PDF re-rendered.

**Human gate (runner: Levi, residential IP):** zip `wp-plugin/megc-site-content/` → wp-admin → Plugins → Add New → Upload Plugin → *Replace current with uploaded* → Activate. **Do this once, after Phases 1 and 2 both merge** (Phase 2 also changes the field-group JSON).

**Destination proof (runner: Levi or a session with his Chrome):** Pages list → "View" on Music opens `megcmusic.com/music`; "Preview" on any page opens the live page; admin bar site name opens `megcmusic.com`; `admin.megcmusic.com/` signed out → 302 to `megcmusic.com/`; `admin.megcmusic.com/cart/` still 200 on WordPress. Record in `output/phase-1-gate.md`.

## 3. Phase 2 — Wire the dead fields (PR `fix/dead-fields`)

One PR, because the six surfaces share one fetcher line each and one oracle. Order inside the PR: tests first.

**2.1 Fetch.** `scripts/fetch-wp-content.mjs` `SURFACES` gains `booking: 5`, `shows: 20`, `shop: 1847`, `"solo-acoustic": 2931`, `"full-band": 2939`, `collabs: 3742`. `scripts/fetch-releases.mjs` reads each release page's `reviews` repeater (page id from `release_page`) and the Music page's body (`_fields=acf,content`), writing `reviews[]` per release row and `intro[]` (the ≥6-word paragraphs) at the top level.

**2.2 Readers (pure, tested).** `src/lib/booking-content.ts`, `page-basics.ts` (shows + shop lede/meta), `formats-content.ts`, `collab-content.ts`, `release-reviews.ts` (`parseReviews`: empty text dropped; *quote* vs *accolade* decided by the row's `kind` when set, else by shape — a sourced sentence of six-plus words that does not start with `#`, a digit or "Top" is a quote). `releases-content.ts` exposes `getReviews(slug)` and `MUSIC_INTRO`.

**2.3 Pages.** `/booking`, `/shows`, `/shop` read lede + metadata (and `/booking` its intro, checklist and facts) from the readers. `/music` reads formats and collab groups from the readers and its intro from the snapshot (the request-time `getPage` read goes; `revalidate` stays). `/music/[slug]` reads reviews from the snapshot. Delete `src/config/formats.ts`, `collaborate.ts`, `reviews.ts`.

**2.4 Plugin 1.4.1 (JSON only).** `group_megc_release_reviews.json`: each row gains `kind` (select: Quote / Accolade, default Quote, help text says what each looks like). `group_megc_music.json`: a `message` field above the releases repeater — "The gallery in the editor above is not shown on the site. The Music page is built from this list." (diagnosis §6.1). `group_megc_work_with_me.json`: offering `detail` help text says it renders after the title.

**2.5 Proof.** (a) Reader tests red before the readers exist, green after, one planted bug per reader turns its test red, restored — the PR lists each. (b) Oracle test: each reader on the committed snapshot equals the strings in `hardcoded-strings.json` / the deleted config, except the rows the PR names as Meg's edits. (c) Local `npm run build` + rendered-text diff of `/booking`, `/shows`, `/shop`, `/music`, `/music/shadows-of-a-ghost-town`, `/music/kindred-spirits` against production — differences are only the named rows. (d) Generated snapshots: the six new files are committed; `releases.json` is regenerated and its diff read for upstream drift (learning #69) before commit. (e) Guide §02 rows for Booking, Shows/Shop, Collabs, Solo/Full Band, Release pages are now true; §04 gains the quote/accolade note; PDF re-rendered.

## 4. Phase 3 — Blocks and reordering on every page (Sprint 17, on approval)

The audit's item 4. Design for Levi's approval, then filed as its own sprint:

- **One control per page: "Page layout"**, an SCF Flexible Content field (`page_layout`) in its own tab on every tracked page. Its layouts are (a) that page's **fixed sections** as zero-field layouts, `max: 1` each (e.g. Home: Shows, Liner Notes, Instagram, Press Kit, Videos, Mailing List, Discography, Singles) — Meg drags to reorder, removes to hide; and (b) the **content blocks** from Sprint 13 (announcement, pull quote, video) plus, if Levi wants them, *text* (heading + paragraphs) and *photo* (image + caption), which are new designed components and need Gate 2 (`sc-a11y-spec`, tokens).
- **Empty field = today's order, byte-identical.** The renderer maps the layout list to a per-page section registry; hero, header, chrome and footer are outside the list.
- **Per-page field groups are generated**, not hand-written: `src/lib/page-sections.ts` is the single source (ids, labels, help text per route); `scripts/wp-plugin/build-layout-groups.mjs` emits `acf-json/group_megc_layout_<slug>.json`, with a `--check` mode in CI so the JSON can never drift from the registry (learning #178).
- Per-page PRs with the Sprint 13 proof pattern (noise floor, region diff with one block, empty-zone identity). Estimated 8–10 PRs; the plugin re-upload is one human gate at the end.
- **Decision needed from Levi:** three block types (shipped) or five (two new designs at Gate 2)?

## 5. Stop conditions

Stop and surface to Levi if: a WP field's current value differs from the repo string in a way that changes layout (not just words); the parity diff shows anything beyond the named rows; the reviews quote/accolade rule mis-sorts any current row; or the fetch for any new surface fails all three attempts (a host problem, not this sprint's).

## 6. Close-out

Both PRs merged; plugin uploaded once and the Phase-1 gate recorded; ADRs logged; `LEARNINGS.md` via `sc-learn`; `WORKSPACE.md` note updated; Sprint 17 filed or the §4 decision recorded as declined.
