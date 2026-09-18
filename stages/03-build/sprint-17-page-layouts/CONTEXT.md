# SPRINT 17 — Page layout on every page: reorder, hide, and five block types (CONTRACT)

> Filed 2026-09-17 from Levi's answer "5" to the Sprint 16 §4 question. Filed beside Sprint 14; the `Current sprint:` pointer stays on Sprint 14. Branch `feat/page-layouts` off a clean `main`.
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules |
> | Workflow gates | `../../../../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | Decision log | `decisions/decisions.md` | 2026-09-17 Sprint 17 kickoff ADR (the seven decisions bind); 2026-09-10 Home blocks; 2026-08-29 Sprint 11 decisions 1–3 |
> | Sprint 16 audit | `../sprint-16-front-door-and-dead-fields/output/parity-audit.md` | §2 is the per-route section inventory the registry was built from |
> | Sprint 13 contract | `../sprint-13-home-blocks/CONTEXT.md` | The block pattern, the parity method (inject, then `npx next build`), the a11y-spec-first rule |
> | Registry | `src/lib/page-layouts.ts` | Single source of every route's sections |
> | Reader + blocks | `src/lib/page-layout.ts`, `src/lib/blocks.ts` (+ tests) | The rules, tested |
> | Generator | `scripts/wp-plugin/build-layout-groups.ts` | Emits the field groups; `--check` in `unit-tests.yml` |
> | Renderer | `src/components/Blocks/PageLayout.tsx`, `BlockRun.tsx`, `TextBlock.tsx`, `PhotoBlock.tsx` | Sections in Meg's order; blocks between them |
> | A11y spec | `_config/design-system/a11y-spec.md` | Page layout, text block, photo block entries (written before the components) |
> | Guide | `docs/meg-editing-guide.html` (+ `.pdf`) | §05 rewritten |
>
> **Turn ceiling:** 40 turns. **Phase status (2026-09-17):** 0 design ✅ (ADR) · 1 build ✅ (registry, reader, blocks, generator, ten routes wired, spec, guide) · 2 proof — parity of every route with empty layouts (text diff vs production: identical except live data and `useId`), injection proof on `/epk` (below) · 3 PR open, awaiting merge + plugin 1.5.0 upload.

---

Project: megcmusic-site · Owner: Levi · Client editor: Meghan Clarisse Cave · Date: 2026-09-17 · Status: IN PROGRESS.

**Prime directive:** on any page in her dashboard, Meg drags her page's sections into the order she wants, hides one, and drops an announcement, a quote, a video, a text section or a photo between any two — and until she touches the list, the page is byte-for-byte today's.

## 0. Owner decisions — do not reopen

The seven decisions of the 2026-09-17 kickoff ADR: one `layout_<route>` field per route; empty = today, listed-first then the rest, hidden = gone; route keys the field (page 4350 carries two); registry generates the JSON with a CI check; Home's `home_blocks` stays as the What's New section; a11y spec before components; photo blocks through Photon.

## 1. Invariants

- Every route with an empty layout renders the same text, metadata, links and section order as production (Sprint 11 §2). Proof: local production build, text diff per route; differences only live data the local server can reach, and `useId` renumbering (LEARNINGS 2026-09-11).
- With a layout, only the listed changes happen: proof by injection into the build's own snapshot, then `npx next build` (never `npm run build`, whose prebuild overwrites the injection — LEARNINGS 2026-09-11), screenshots at 1440 and 390, section order read from `aria-labelledby`.
- `npm run layout:check` green; `npm test` green; tests first for the reader and the two new block parsers; a planted bug per new parser goes red.
- Every render map names every registry id (`PageLayout` throws at build otherwise — the build is the check).
- Tokens only in the two new components; no new token. Nothing interactive added (text and photo blocks are static).

## 2. Proof record

Filled at close: `output/proof.md` — the parity table, the injection screenshots, the CI run.

## 3. Human gate

Plugin 1.5.0 upload (README step 2), once, after merge. Verify: any tracked page shows a *Page layout* box; `pages/608?acf_format=standard&_fields=acf` carries `layout_epk`.

## 4. Stop conditions

Stop and surface if: any route's empty-layout diff shows a section moved or dropped; a route needs a section that cannot be expressed as a closure over its data; the plugin's field-group count makes the editor noticeably slower for Meg (report, do not guess).
