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

## 2026-06-16 — Sprint-2 token additions (nav underline, pill radius, micro motion, focus ring)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The nav + hero design (Figma `39:97` / `39:4`) uses values not yet in `token-map.css`: the cream nav active-underline `#fffcdb`, a 9999px pill radius, a hover/focus micro transition, and a focus ring. `token-map.css` (the logged client source of truth — the `.md` is an unfilled studio template) carried only color/type/spacing. No raw hex or magic numbers may reach shipped code (WORKSPACE §3).
**Decision.** Add four token groups to `token-map.css`: `--mc-nav-underline:#fffcdb`, `--mc-radius-pill:9999px`, `--mc-motion-micro:120ms` + `--mc-ease-out`, and `--mc-focus-ring:#241420`.
**Rationale.** The design uses these values; tokenizing them is the only standard-compliant way to reference them. `--mc-focus-ring` is a dedicated ring value (studio learning #32) separate from the brand accent — the dark plum gives AA contrast on the pink pill where the accent would not.
**Alternatives considered.** (1) Raw hex/px in the CSS Module — rejected, violates the non-negotiable. (2) Reuse `--mc-accent-*` for the focus ring — rejected per learning #32 and AA failure on the pink pill.
**Consequences.** Easier: nav/hero reference tokens only; future surfaces inherit the same ring/motion. Harder: token-map.css now carries radius/motion groups that should eventually mirror back into the `.md` template and Figma.

## 2026-06-16 — Mobile nav: full-width floating pill, no hamburger
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The Figma nav (`39:97`) is specified at desktop only; CONTEXT.md delegates the mobile pattern to the build with a logged decision. Five short links (Home/Shows/Media/Booking/Shop).
**Decision.** Render the nav as a full-width floating pill at ≤768, links in a single centered row, no hamburger.
**Rationale.** The five labels measure ~287px of text+gaps against ~342px inner width at 390 — they fit without truncation. A hamburger is a recognizable template default (slop-blocklist) and adds a JS toggle + overlay for no benefit at this link count; keeping the pill preserves the worn-poster character across breakpoints.
**Alternatives considered.** (1) Hamburger drawer — rejected: unnecessary for 5 short links, adds slop + JS. (2) Horizontal-scroll pill — rejected: hidden links, poor affordance.
**Consequences.** Easier: one nav structure across all breakpoints, no client JS, no overlay. Harder: adding links later forces a reflow strategy (revisit then).

## 2026-06-16 — Previews are Vercel subdomain deploys, not /_previews/[N]/
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted

**Context.** The Sprint-2 brief (a templated command) referenced asset paths and a preview URL of the form `https://[domain]/_previews/[pr-number]/`. That is the studio's Hostinger static-site model (learnings #25–28). This repo deploys previews via `preview-deploy.yml` using `vercel deploy --prebuilt`, serving each PR at its own Vercel subdomain root; `next.config` sets no `basePath`/`assetPrefix`, and the project is ISR-only (static export is out, WORKSPACE §3).
**Decision.** Treat the Vercel preview deployment URL (workflow output) as the canonical preview URL; do not target a `/_previews/[N]/` subdirectory, which does not exist here.
**Rationale.** Vercel previews serve at subdomain root exactly like production — no subdirectory, so the learning-#25 subdirectory trap does not apply. The `/_previews/` path was copied forward from a different host model.
**Alternatives considered.** (1) Introduce a `/_previews/[N]/` basePath — rejected: contradicts the Vercel preview model and ISR hosting, adds needless routing complexity.
**Consequences.** Easier: standard Next/Vercel asset + routing behavior. Harder: the brief's preview-URL line and "must work at /_previews/[N]/" clause are superseded by this entry; asset paths are kept relative regardless, so they remain correct if a subpath is ever introduced.

## 2026-06-16 — Sprint-2 asset strategy: local files, hand-authored pick, exported logo SVG
**Stage:** 03-build
**Type:** Stack / tech choice
**Status:** accepted

**Context.** Hero needs three assets (guitar pick, "Meghan Clarisse" name lockup, background photo IMG_3132). Studio rule + brief: no expiring Figma MCP URLs in shipped code; client direction: images local (not Cloudinary), logo as SVG.
**Decision.** Ship all three as local files under `public/images/hero/` via relative paths: name lockup as the exported vector SVG (Figma page-bg rects stripped), background photo as an optimized JPEG (1500×2000, ~480KB) downsized from the 3024×4032 original, guitar pick as a hand-authored inline tokenized SVG.
**Rationale.** The lockup exports as true vector (one gradient-filled compound path) — satisfies "logo as SVG" with full scalability. The pick is a generic decorative shape whose Figma export came wrapped in page-frame junk; hand-authoring yields a clean `currentColor`-tintable path with no artifacts. Local files remove the Cloudinary dependency and expiring-URL risk entirely.
**Alternatives considered.** (1) Cloudinary — rejected per client direction. (2) Figma raster export of the logo — rejected: not a true SVG. (3) Cleaning the pick's frame-export SVG — rejected: more fragile than a hand-authored silhouette.
**Consequences.** Easier: no external image service, no expiring URLs, tintable pick. Harder: the hand-authored pick is not pixel-identical to the Noun Project source (acceptable for decoration; swap later if needed); the photo is a single JPEG — a `<picture>`/WebP responsive pass is deferred to the Gate-3 perf review.
