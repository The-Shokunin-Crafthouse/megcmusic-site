# Decisions Log

Append-only log of non-trivial decisions made on this project. Entries are not edited in place — if a decision is reversed, a new entry records the reversal and references the original.

## What belongs here

- Decisions with irreversible or cross-cutting consequences
- Trade-offs that took meaningful discussion
- Scope changes, gate bypasses, and deferred items
- Stage closures (Gate 1, Gate 2, Gate 3, Gate 4, Close)
- Retrospective entries at day 14 post-launch

## What does not belong here

- Transient implementation notes → stage `build-notes.md`
- Bugs → `stages/04-review/output/punch-list.md`
- Design exploration → `stages/02-design/claude-design/` or `./figma/`

## Entry format

```
## YYYY-MM-DD — [short title]
**Stage:** [01-brief | 02-design | 03-build | 04-review | 05-launch]
**Type:** [Stack / tech choice | UX / design tradeoff | Architecture | Product / scope call]
**Status:** [proposed | accepted | superseded by <date-title> | reversed]

**Context.** What situation forced the decision. Include relevant constraints — timeline, prior decisions, what would happen if no choice were made.
**Decision.** What was chosen. One sentence, starting with a verb.
**Rationale.** Why — the reasoning behind the choice.
**Alternatives considered.** What else was on the table and why it was ruled out. At least one alternative; if only one option existed, say so.
**Consequences.** Easier: what this simplifies or de-risks. Harder: what this constrains or makes more expensive to change.
```

---

## Entries

<!-- Append new entries below. Newest at the bottom. Do not edit historical entries. -->

## 2026-06-16 — Client project: isolated token system
**Stage:** 01-brief
**Type:** Stack / tech choice
**Status:** accepted

**Context.** megcmusic-site is client work for Meghan Clarisse Cave, not a Shokunin-branded property. The operating rule (WORKSPACE.md §4, "Token source is conditional") requires recording at kickoff which token source governs. The shared design system at `brand.shokunincrafthouse.com` carries studio brand identity that must not leak into client work.
**Decision.** Own an isolated `_config/design-system/token-map.css`; do not consume the Shokunin shared design system; decline Tailwind in favor of CSS custom properties + CSS Modules.
**Rationale.** The client has its own brand — dark plum palette, Lora/Open Sans/Praise/Newsreader, guitar-pick and ★★★ motifs — defined in Figma `908TLdOM0e6xRtnzOj2nNv`. Coupling to the studio system would impose studio identity and create a cross-repo dependency on `brand.shokunincrafthouse.com` for a property that must stand alone. Tailwind's preset scales are a recognizable AI fingerprint (studio anti-default) and conflict with a token-first, Figma-mirrored system.
**Alternatives considered.** (1) Consume the shared design system — rejected: it is studio-branded and would not represent the client. (2) Tailwind for speed — rejected per studio default (opt-in only, written reason required); the token-map + CSS Modules path is the studio default and mirrors Figma one-for-one.
**Consequences.** Easier: client brand evolves independently; no coupling to studio brand releases; raw values confined to one file. Harder: tokens are hand-maintained against Figma rather than inherited; any future shared-system adoption would be a migration.

## 2026-06-16 — Web fonts via Google Fonts @import
**Stage:** 01-brief
**Type:** Stack / tech choice
**Status:** accepted

**Context.** The brand type system — Lora, Open Sans, Praise, Newsreader — must load on every surface from scaffold onward. Studio learnings prefer self-hosting display faces (`self-host-variable-font-axes`, `font-display-optional`) to avoid the visible late-swap re-render.
**Decision.** Load all four families from Google Fonts via a single `@import` in `globals.css` with `display=swap`, for the scaffold and initial sprints.
**Rationale.** All four are standard Google Fonts with no secondary axes in use (no `slnt`/`opsz`/custom requirement), so the primary reason to self-host does not yet apply. A single CDN `@import` is the fastest path to a correct type system during scaffold, and the brief specifies a `globals.css` import.
**Alternatives considered.** (1) Self-host subset woff2 with `font-display: optional` — deferred to the Gate 3 performance pass, where late-swap and CLS are measured and the display faces (Lora, Praise) can be subset and self-hosted if the swap is visible. (2) `next/font/google` — viable, but the brief specifies a `globals.css` `@import`; revisit alongside the self-host decision.
**Consequences.** Easier: type system correct immediately; no font files to manage now. Harder: a render-blocking CDN `@import` and possible swap flash remain until the Gate 3 self-host pass; must be revisited before launch.
