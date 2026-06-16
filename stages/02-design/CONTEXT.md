<!-- ============================================================ -->
<!-- CONTEXT.md — 02 DESIGN                                       -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The contract for stage 02 of this project. Directive.        -->
<!-- Defines the scope of work and Gate-2 criteria.               -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Confirm Gate 1 has closed before producing outputs.       -->
<!-- 2. Load _config/design-system/ui-rules.md and token-map.md.  -->
<!-- 3. Load _config/brand/ and _config/voice/ if populated.      -->
<!-- 4. Produce outputs into ./output/. Figma exports into        -->
<!--    ./figma/. Model-generated design artifacts into           -->
<!--    ./claude-design/ (or equivalent per model).               -->
<!-- 5. Surface ambiguities here — do not push them to build.     -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKFLOW.md §"02 — Design" for gate criteria.          -->
<!-- ============================================================ -->

# Stage 02 — Design

## Purpose

Resolve every decision a builder would otherwise improvise. Design until ambiguity is gone. Hand stage 03 a specification, not a vibe.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Studio core | global via `~/.claude/CLAUDE.md` | principles + §3 quality criteria | Loaded globally — the design bar |
| Project identity | `../../WORKSPACE.md` | all | Rules + `Current sprint:` pointer |
| Canonical workflow | `../../../studio-memory/WORKFLOW.md` | §"02 — Design" | Gate-2 criteria |
| Brief output | `../01-brief/output/` | all | Gate-1 artifacts |
| Brand | `../../_config/brand/` | all if populated | Brand inputs |
| Voice | `../../_config/voice/` | all if populated | Voice inputs |
| Design system | `../../_config/design-system/` | token-map, ui-rules, figma-links | Tokens + rules + Figma links |
| **Creative defaults** | `../../../studio-memory/playbooks/creative-defaults.md` | all | **Moved out of always-loaded core (Phase 1) — load explicitly or it silently stops applying** |
| **Quality criteria** | studio core §3 (global) + `sc-verify` | full §3 (motion/type/color/spacing/interaction/responsive) | **The bar every design output must hit** |
| Decisions | `../../decisions/decisions.md` | relevant | Prior calls; do not reopen without reason |

## Process

1. Confirm Gate 1 has closed before producing outputs.
2. Solve type first — resolve every decision a builder would otherwise improvise.
3. Every value is a token (no raw hex); check against creative-defaults + the §3 quality criteria.
4. Surface ambiguity here — do not push it to build.
5. Resolved spec → `./output/`; Figma exports → `./figma/`; model-generated artifacts → `./claude-design/`.

## Working folders

- `./figma/` — snapshots, exported frames, file pointers
- `./claude-design/` — model-generated design artifacts (explorations, specs, diffs)
- `./output/` — the resolved design specification

## Outputs (`./output/`)

- `type-system.md` — scale, ratio, families, pairings, tracking, measure
- `color-tokens.md` — full token set with light and dark values
- `spacing-scale.md` — scale and usage rules
- `components.md` — component inventory, every state
- `screens/` — key screens at required breakpoints (390, 768, 1024, 1440, 1920)
- `motion.md` — principles, curves, durations, trigger mapping
- `interaction-spec.md` — five states for every interactive element
- `a11y-notes.md` — contrast, focus, keyboard path decisions

## Working notes

- Solve type before anything else. Changing typefaces late is a redesign.
- No raw hex in mocks. Every color is a token.
- Dark mode is fully designed or formally deferred — the decision is logged.
- Write copy in the mocks. Not placeholders. Not lorem.
- Motion decisions are written, not just prototyped. Someone must be able to rebuild motion from the doc.
- Every breakpoint is designed, not asserted. "It'll stack" is not a layout.

## Gate 2 — Design sign-off

Closes when:

- [ ] Type system resolved and documented
- [ ] Tokens named and finalized — no raw hex remaining
- [ ] Responsive behavior specified at all required breakpoints
- [ ] Motion principles stated (curves, durations, triggers)
- [ ] Dark mode fully designed or formally deferred (logged)
- [ ] Accessibility reviewed — contrast, focus, keyboard paths
- [ ] Copy in mocks is production-intent (no lorem)
- [ ] All five interaction states specified for every interactive element

## Handoff

Once Gate 2 closes:
1. Update `workspace.manifest.yaml` `project.stage` to `03-build`.
2. Log the Gate-2 close in `decisions/decisions.md`.
3. Move to `stages/03-build/`.
