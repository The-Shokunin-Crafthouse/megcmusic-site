<!-- ============================================================ -->
<!-- WORKSPACE.md — THE SHOKUNIN CRAFTHOUSE — PROJECT IDENTITY    -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The root identity file for a Shokunin Crafthouse project     -->
<!-- workspace. Model-neutral. Source of truth for who we are,    -->
<!-- what we are making, and the rules of the work. Every other   -->
<!-- file in this workspace inherits from this one.               -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Read this file completely before taking any action.       -->
<!-- 2. Load WORKFLOW.md for stage sequence and approval gates.   -->
<!-- 3. Follow the "Current sprint:" pointer to that sprint's     -->
<!--    CONTEXT.md — the active sprint contract.                  -->
<!-- 4. Load only the files named in that CONTEXT.md Inputs       -->
<!--    table — _config/ sections selectively, never in full.     -->
<!-- 5. Read decisions/decisions.md before reopening any          -->
<!--    previously resolved question.                             -->
<!-- 6. Never cross an approval gate without explicit studio      -->
<!--    sign-off.                                                 -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- WORKFLOW.md → "Current sprint:" CONTEXT.md →                 -->
<!-- Inputs-table files                                           -->
<!-- ============================================================ -->

# WORKSPACE — MegCMusic

## 0. WHAT WE ARE

The Shokunin Crafthouse is a precision-first creative studio. *Shokunin* (職人) is the artisan who devotes a life to mastering a craft, not to finishing tasks. Every artifact in this workspace is held to that standard.

Design and engineering are not separate here. Both serve the felt quality of the work. Pixels, easing curves, API response shapes, database indexes — every layer is craft.

We ship work that feels inevitable. "Good enough" is not a ship criterion. Work ships when it cannot be improved without changing its nature.

This file is a directive, not documentation. Read it. Follow it.

## 1. PROJECT META

- **Name:** MegCMusic
- **Client:** Meghan Clarisse Cave
- **Kind:** site
- **Current stage:** 01-brief
- **Lead:** Levi Bahn
- **Start date:** 2026-06-16
- **Target launch:** TBD (set at Gate 1)
- **Production domain:** megcmusic.com
- **Current sprint:** `stages/03-build/sprint-05-shows-archive/` (approved 2026-07-02)

Canonical machine-readable meta lives in `workspace.manifest.yaml`. Keep this section and the manifest in sync.

## 2. NORTH STAR

Meghan's primary professional presence — booking tool, show calendar, merch store, press resource, and fan hub — rebuilt headless so the site finally moves the way her music does: warm, dark, and unmistakably hers, with motion alive by default. She runs the whole thing from WordPress exactly as she does today and never touches a line of code.

## 3. NON-NEGOTIABLES

These cannot be traded away under schedule pressure. Recorded here so no one has to re-argue them mid-project.

- Accessibility: AA minimum on all shipped surfaces; AAA on legal and disclosure copy
- Performance: LCP < 2.5s, CLS < 0.1, INP < 200ms on representative network
- No lorem ipsum reaches staging. Ever.
- No raw hex, no magic numbers, no ad-hoc font sizes in shipped code — values come only from `_config/design-system/token-map.css`
- Every interactive element ships five states: default, hover, focus, active, disabled
- Reduced-motion delivers a functional path, not a blank page
- Meg never touches code, Vercel, or REST keys — everything she manages stays in WordPress, WooCommerce, and The Events Calendar exactly as today
- ISR only — static export is out (it disables ISR for shows and products)
- Motion is alive by default; a static section requires a written reason

## 4. OPERATING RULES

**Read before writing.** No output begins without WORKSPACE.md, WORKFLOW.md, and the current sprint's CONTEXT.md loaded. Violations produce drift.

**Stage gates are binding.** Do not start work in stage N+1 until stage N is signed off. If a later-stage problem is rooted in an earlier stage, return to the owning stage and fix it there. Do not patch downstream.

**Decisions are logged.** Every decision with irreversible or cross-cutting consequence is recorded in `decisions/decisions.md` with date, context, and rationale. Unlogged decisions are provisional and may be reopened without notice.

**Token source is conditional.** For a Shokunin-branded property, the shared design system at `brand.shokunincrafthouse.com` governs color, type, spacing, motion, radius (linked shared CSS, generated from the shared JSON); local `token-map.md` is bypassed. For a client project, `_config/design-system/token-map.md` governs, and Figma mirrors those tokens. `decisions/decisions.md` records which applies (logged at kickoff). Code imports are generated from the active source, never hand-authored. **This project is client work: the isolated local token source governs — see decisions/decisions.md (2026-06-16).**

**Copy is design.** Button labels, error states, onboarding, empty states, microcopy — all written, never filler. Placeholder copy is a bug.

**Motion is causality.** If a transition does not answer *what happened and why does it matter*, cut it. Springs for interactive affordances; duration-based easing only on scripted timelines.

**Accessibility is present from layer one.** Contrast, focus, keyboard paths — designed in, not audited in.

**Names are copy.** Variables, functions, files, components — chosen with the same care as button labels. A name that needs a comment is the wrong name.

**Surface ambiguity, do not resolve it silently.** If the spec does not answer a question, return to the owning stage. Do not improvise a value and continue.

## 5. STUDIO PRINCIPLES (INHERITED)

These come from `studio-memory.md` and apply to every Shokunin Crafthouse project. Override only with a written, logged decision.

- Subtraction precedes addition. Two passes remove before one pass adds.
- Typography decides the room. Solve type first, always.
- Every design decision is expressible as a rule. One-offs are debt.
- Perceived performance is the real performance.
- Dense UIs read as capable; sparse UIs read as premium. Pick the register deliberately.
- Detail is the craft, not the polish: scrollbar, favicon at 16px, empty state, 404, skeleton, form-error copy.
- Start monochromatic. Add an accent late, with purpose. Three colors is usually one too many.
- One typeface family with full range beats two in conflict.
- Dark first when both modes are viable. Design dark, derive light.

## 6. STAGE INDEX

| Stage | Folder | Owner artifact | Gate |
| --- | --- | --- | --- |
| 01 — Brief | `stages/01-brief/` | Scope, references, constraints | Concept sign-off |
| 02 — Design | `stages/02-design/` | Type, tokens, layout, motion, interaction | Design sign-off |
| 03 — Build | `stages/03-build/` | Shipping implementation | Build sign-off |
| 04 — Review | `stages/04-review/` | QA, performance, accessibility, parity | Review sign-off |
| 05 — Launch | `stages/05-launch/` | Deploy, monitoring, handoff | Close |

Gate criteria live in `WORKFLOW.md`.

## 7. CANONICAL PATHS

Parseable index: `workspace.manifest.yaml`.

- `WORKSPACE.md` — this file. Project identity.
- `WORKFLOW.md` — stage flow and approval gates.
- `workspace.manifest.yaml` — machine-readable index.
- `adapters/` — model-specific bootstraps (claude, generic, others).
- `_config/brand/` — logo, palette, visual identity artifacts.
- `_config/voice/` — copy guidelines, tone references, lexicon.
- `_config/design-system/` — tokens, Figma links, UI rules.
- `stages/<n>/CONTEXT.md` — stage or sprint contract (Inputs table, audit checklist).
- `stages/<n>/output/` — shipped artifacts for that stage.
- `decisions/decisions.md` — decision log (append-only).

## 8. WHAT NOT TO DO IN THIS WORKSPACE

- Do not create new top-level folders without updating `workspace.manifest.yaml`.
- Do not write content that contradicts `_config/voice/` without a logged decision.
- Do not introduce color, type, spacing, or motion values outside the project's token source (shared design system or local token map, per the operating rule above).
- Do not skip a stage. If scope genuinely bypasses one, record the bypass in `decisions/decisions.md`.
- Do not duplicate project rules into tool-specific config files (`CLAUDE.md`, editor configs, etc.). They live here. Adapters point back.
- Do not treat this file as reference material. It is a directive. Follow it.

## 9. TECHNICAL PROFILE

The application is a Next.js front-end over an existing, unchanged WordPress backend. Full architecture, page list, motion system, and sprint plan live in the project brief (`megcmusic-project-brief.md`); this section is the at-a-glance contract.

- **Purpose:** Headless WordPress front-end for Meghan Clarisse Cave, Colorado-based singer-songwriter. In-place replacement of the existing WordPress/Storefront theme.
- **Primary deliverable:** Full artist site — homepage, shows, shop, EPK, media, booking.
- **Tech stack:** Next.js (App Router, ISR) · CSS custom properties + CSS Modules (Tailwind declined) · GSAP (scroll scenes) · Three.js (WebGL atmosphere, pending Gate 2) · Framer Motion (React interactions) · Zustand (client/cart state).
- **Key design constraints:** Dark plum palette · Lora / Open Sans / Praise / Newsreader type system · guitar-pick motif · ★★★ section-label pattern · motion alive by default.
- **Token source:** `_config/design-system/token-map.css` (client-isolated — does not consume the Shokunin shared design system). Mirrors Figma `908TLdOM0e6xRtnzOj2nNv`.
- **Production domain:** megcmusic.com (Vercel serves the front-end; Next.js calls `megcmusic.com/wp-json/...` directly — no subdomain).
- **Data layer (REST):**
  - WP REST base — `https://megcmusic.com/wp-json`
  - WordPress (pages/content) — `https://megcmusic.com/wp-json/wp/v2`
  - WooCommerce (products/orders) — `https://megcmusic.com/wp-json/wc/v3`
  - The Events Calendar (shows) — `https://megcmusic.com/wp-json/tribe/events/v1`
- **Revalidation:** events ISR 1h · products ISR 24h · pages static at build.
- **Code clients:** `src/lib/api/{wordpress,woocommerce,events}.ts`.

## COWORK DEFAULTS

- Output format: Markdown unless specified
- File location: save all outputs inside this project folder unless directed otherwise
- Approval gate: stop and confirm before modifying any file that already exists
- Context to load: read cowork-context.md from ~/Projects/shokunin-crafthouse/studio-memory/ 
  at the start of every session
