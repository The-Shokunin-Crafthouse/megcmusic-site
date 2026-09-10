# SPRINT 13 — Home content blocks: one flexible zone, three block types (CONTRACT)

> Filed 2026-09-10 from Levi's Phase C pick ("go with option 2", 2026-09-10) and his approval of the Home blocks audit with the zone **after Instagram** ("after instagram, file sprint 13"). The audit is the source of every scope line below: `../sprint-12-findability-and-blocks/output/phase-c-home-blocks-audit.md`. Branch per phase off a clean `main` (confirm `git status` first — ADR-072 main-sync).
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules; sprint pointer |
> | Workflow gates | `../../../../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | Decision log | `decisions/decisions.md` | The 2026-09-10 entry superseding Sprint 11 decision 1.4 for Home; the 2026-09-10 Sprint 13 kickoff entry; the 2026-08-29 Sprint 11 kickoff (decisions 1–3 still bind) |
> | The audit | `../sprint-12-findability-and-blocks/output/phase-c-home-blocks-audit.md` | Verdict per Home section, the three block types and fields, per-layer changes, PR plan — approved by Levi |
> | Repo learnings | `LEARNINGS.md` | 2026-08-27 Bluehost entries (admin-hook fatals); 2026-09-06 parity-probe entries |
> | Sprint 11 contract | `../sprint-11-wp-editability/CONTEXT.md` | Invariants inherited verbatim (§2) |
> | Home today | `src/app/page.tsx`, `src/lib/home-content.ts`, `src/components/LinerNotes/`, `src/components/Videos/VideosGallery.tsx`, `src/components/Instagram/` | The slot, the reader to extend, the two components the blocks derive from |
> | Plugin | `wp-plugin/megc-site-content/megc-site-content.php`, `acf-json/group_megc_home.json`, `README.md` | The field group to extend; the re-upload click path (the human gate) |
> | Fetcher | `scripts/fetch-wp-content.mjs` | Already writes the whole `acf` object — verify, do not change |
> | Token map | `_config/design-system/token-map.css` | Every block value comes from here; no new token without a logged decision |
> | Parity harness | `scripts/parity/README.md`, `parity.mjs`, `states.mjs` | Noise floor first, every phase |
> | Guide | `docs/meg-editing-guide.html` (+ `.pdf`) | Section 02 Home row; new section on blocks; re-render with Playwright `page.pdf` |
> | Unit tests | `npm test` (`src/**/*.test.ts`, node:test via tsx; `unit-tests.yml` on every PR) | The reader's block parsing gets tests |
>
> **Resume pointer:** `SESSION-RESUME.md` at repo root (hook-owned). **Turn ceilings:** Phase 0 30 turns, Phases 1–3 20 each, Phase 4 15. On hitting one: park with a resume note, open the PR as draft with what exists, stop.
>
> **Phase status (2026-09-10):** 0 ✅ merged (#119), human gate cleared 13:33 MDT (`output/phase-0-gate.md`) · 1 in progress (announcement block) · 2 not started · 3 not started · 4 not started.

---

Project: megcmusic-site (The-Shokunin-Crafthouse/megcmusic-site) · Owner: Levi · Client editor: Meghan Clarisse Cave · Date: 2026-09-10 · Status: Approved by Levi — execute Phases 0–4.

**Prime directive:** Meg opens Home in her dashboard, adds an announcement (or a quote, or a video) in a "Blocks" area, moves it where she wants, saves, and sees it on the site in about two and a half minutes — and until she adds one, Home is byte-identical to today. Zero change to design tokens, motion, URLs, or any other page. Decision 1.4 (no page builder, studio creates new pages) stays in force everywhere except this one zone on Home.

## 0. Context you must load first

Read the Inputs table in order. The audit is binding: its verdict column, the slot, the three block types and their fields are approved. Do not reopen them; a change goes back to Levi as one line.

## 1. Owner decisions — already made, logged at kickoff, do not reopen

1. **One flexible zone on Home**, SCF Flexible Content field `home_blocks`, in a "Blocks" tab of the existing Home field group. No zone on any other page.
2. **Slot: after Instagram, before the EPK teaser** (`src/app/page.tsx` between `<Instagram />` and the EPK/BootScene wrapper).
3. **Three block types, exactly the audit's fields:** `announcement` (eyebrow, headline, body?, link_label? + link_url?), `pull_quote` (quote, attribution), `video` (youtube_url, caption?). No fourth type this sprint.
4. **Empty-state rule:** a block missing its required field renders nothing; an unknown layout renders nothing and is logged at build. An empty zone renders nothing — Home byte-identical.
5. **Every block is a designed component** derived from an existing one (the ★★★ label + paragraph; `LinerNotes`' pull quote, extracted; `VideosGallery`'s facade). Tokens only. `sc-a11y-spec` before each block is built.

## 2. Invariants — inherited from Sprint 11 verbatim, plus three

- Pixel parity at 390/768/1024/1440/1920 on every touched route, proven with `scripts/parity/parity.mjs` after establishing the noise floor — never a claim. For Phase 0 the standard is **byte-identical rendered text, metadata and refs on Home**, and pixels inside the noise floor. For Phases 1–3 the standard is: with the zone empty, identical; with one block of the phase's type, the only difference is that block (region proof as in Sprint 12 Phase A).
- Content parity everywhere else. Redirect suite (`/fyc`, `/shadows-of-a-ghost-town`, the admin-subdomain 301) unchanged.
- No WP core/theme edits. Never touch WooCommerce, The Events Calendar, or existing WP content destructively. PHP-8.3-clean, tiny, versioned (`wp-plugin-lint.yml` must pass). The field-group change is JSON only; no admin hooks.
- Fail loudly, never blankly. A fetch failure is never an empty zone; only WP returning no blocks is.
- Process: protected `main`, one PR per phase, ADR per locked decision (dated, supersede-never-rewrite, append-only — learning #163; union-merge the log on conflict, learning #53), LEARNINGS at close via `sc-learn`, resume pointer maintained, turn ceiling per phase. Every gate line names its producing artifact and its runner (learnings #181, #226).
- **New:** `home-content.ts` extends its shape with an optional `blocks` array — a superset, never a swap (learning #60). Every existing Home field keeps its name and meaning.
- **New:** the plugin re-upload is the only human gate. Name the exact click path (README steps 2 + 6) and the verification read. Nothing else is handed to a human.
- **New:** five interaction states on anything interactive in a block (the announcement link, the video facade), reduced-motion path, focus ring via the project's focus token. No new token without a logged decision.

## 3. Phase 0 — Field group, reader, empty renderer (human gate inside)

**0.1 Field group.** Add a "Blocks" tab to `acf-json/group_megc_home.json` with `home_blocks` (type `flexible_content`, button "Add a block") and the three layouts, labels and help text written for Meg ("An announcement — a new single, an award, a tour date. The headline is what people read first."). Bump the plugin to 1.3.0. `wp-plugin-lint.yml` green. Artifact: the JSON diff in the PR + the rendered field labels listed in `output/phase-0-field-design.md` (runner: session).

**0.2 Reader + renderer.** `home-content.ts`: parse `acf.home_blocks` into `HomeBlock[]` (discriminated union on `acf_fc_layout`), dropping unknown layouts (logged) and blocks missing a required field. Unit tests for both drops and for each layout's happy path. `src/components/HomeBlocks/` with `HomeBlocks` (Server Component) and `BlockRenderer` mapping layout → component; all three components stubbed to render nothing this phase. Mount `<HomeBlocks />` after `<Instagram />`. Artifact: `npm test` output in the PR; parity on `/` (noise floor first): text, meta, refs identical; pixels within the floor — `output/phase-0-parity/README.md` (runner: session).

**0.3 Human gate — plugin re-upload (runner: Levi, residential IP).** Zip `megc-site-content/` → wp-admin → Plugins → Add New → Upload Plugin → replace current → Activate (README step 2). Verify (step 6): `GET https://admin.megcmusic.com/wp-json/wp/v2/pages/4?acf_format=standard&_fields=acf` returns `home_blocks` (empty array or `false`). Artifact: `output/phase-0-gate.md` with the timestamp and the raw `acf` keys (runner: session reads after Levi confirms). Nothing in Phases 1–3 is verified at the destination before this clears.

**0.4 PR + ADR.** ADR records the field design and the extend-not-swap reader shape.

## 4. Phase 1 — `announcement` block

Design first: type scale and spacing from the ★★★ section label and the pull-quote paragraph; the optional link is the site's existing text-link pattern with five states. `sc-a11y-spec` written before build (`output/phase-1-a11y-spec.md`). Build `Announcement`. Reduced motion: the block's reveal follows the page's existing section-reveal convention, no new motion. Parity: zone empty → identical; one announcement saved by the session on WP page 4 through `wp-ops.yml` (a new `set-acf` op, dry-run first) → the only difference is the block (region proof). Guide not yet. Artifact: `output/phase-1-parity/README.md`, the a11y spec, `npm test`. PR + ADR.

## 5. Phase 2 — `pull_quote` block

Extract `LinerNotes`' pull quote into a shared `PullQuote` component and re-mount it in `LinerNotes` first — **parity on Home must be identical after the extraction alone**, before the block uses it. Then the block. Same artifacts as Phase 1. PR + ADR.

## 6. Phase 3 — `video` block

Reuse `VideosGallery`'s facade (thumbnail + play, one iframe on play, `youtube-nocookie`); id parsing via `src/lib/media-videos.ts` `youTubeId`. An invalid URL renders nothing. Same artifacts. PR + ADR.

## 7. Phase 4 — Guide, save-and-check, close-out

Guide: section 02 Home row gains "and the Blocks area"; a new short section — add a block, move it, remove it, what each type is for; re-render the PDF. **Save-and-check (runner: Levi, as Meg):** a real announcement added in her dashboard, timed to live on `megcmusic.com`, screenshot; `output/phase-4-save-and-check.md`. Test blocks the session saved in Phases 1–3 are removed from page 4 before this (recorded). Close-out per §9.

## 8. Stop conditions — park and report instead of improvising

Stop and surface to Levi if: SCF's Flexible Content does not appear in REST for page 4 after the re-upload; the reader cannot keep every existing Home field unchanged; a block cannot be built from existing tokens and components without a new token; parity on Home with an empty zone is not identical; the plugin re-upload fails or wp-admin is unreachable (2026-08-27 class — name the exact file to rename); or Meg's dashboard shows the zone anywhere but Home. Name the blocker, what you tried, and the smallest decision needed — then stop.

## 9. Close-out

Per phase: PR merged, ADR logged, phase status line in this file updated. At sprint close: `sc-learn` (LEARNINGS.md; promote only what changes an unrelated future project), sprint pointer cleared in `WORKSPACE.md`, this contract marked complete with a dated summary line and the measured save-to-live time from Phase 4.
