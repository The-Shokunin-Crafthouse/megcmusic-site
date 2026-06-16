<!-- ============================================================ -->
<!-- CONTEXT.md — 03 BUILD                                        -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The contract for stage 03 of this project. Directive.        -->
<!-- Defines the scope of work and Gate-3 criteria.               -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Confirm Gate 2 has closed before writing implementation.  -->
<!-- 2. Pull values from ../../_config/design-system/token-map.md.-->
<!-- 3. Follow ../../_config/design-system/ui-rules.md.           -->
<!-- 4. Surface ambiguity back to stage 02 — do not improvise.    -->
<!-- 5. Produce implementation in the project codebase.           -->
<!--    Build-stage artifacts (notes, reports, pointers) go in    -->
<!--    ./output/. Reference material in ./references/.           -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKFLOW.md §"03 — Build" for gate criteria.           -->
<!-- ============================================================ -->

# Stage 03 — Build

## Purpose

Implement the design without drift. The build should be a faithful materialization of stage-02 output — not a reinterpretation.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Studio core | global via `~/.claude/CLAUDE.md` | identity, principles, gates, stack defaults | Loaded globally — do not re-load here |
| Project identity | `../../WORKSPACE.md` | all | Binding project rules + `Current sprint:` pointer |
| Canonical workflow | `../../../studio-memory/WORKFLOW.md` | §"03 — Build" | Gate-3 criteria |
| Design spec | `../02-design/output/` | all | The resolved spec to materialize faithfully |
| Tokens | `../../_config/design-system/token-map.md` | all | Source of truth for values (or shared DS per `decisions/`) |
| UI rules | `../../_config/design-system/ui-rules.md` | all | Component + layout rules |
| **Code standards** | `../../../studio-memory/playbooks/code-standards.md` | all | **Moved out of always-loaded core (Phase 1) — load explicitly here or it silently stops applying** |
| **Creative defaults** | `../../../studio-memory/playbooks/creative-defaults.md` | all | **Same — moved out of core; explicit load required** |
| Build references | `./references/` | as needed | Implementation-only material |
| Decisions | `../../decisions/decisions.md` | relevant | Prior calls; do not reopen without reason |

## Process

1. Confirm Gate 2 has closed before writing implementation.
2. Materialize the stage-02 spec without reinterpretation — values from the token map, rules from `ui-rules.md`, standards from the code-standards playbook.
3. If a design value is missing, return to stage 02 — never invent it.
4. Self-verify against Gate 3 (`sc-verify`) before presenting any build.
5. Build artifacts (notes, reports, pointers) → `./output/`; reference material → `./references/`.

## Outputs

- Implementation in the project codebase (link from `./output/README.md`, do not duplicate)
- Storybook or component index (where applicable)
- Staging deployment URL
- `./output/build-notes.md` — deviations from design with reason, performance baselines, known issues
- `./output/perf-baseline.md` — initial Core Web Vitals measurements

## Working rules

- No raw hex. No magic numbers. No lorem.
- If a design value is missing, do not invent it — return to stage 02.
- Accessibility is designed in; the build preserves it. Do not regress contrast, focus, or keyboard paths.
- Performance is a first-class concern, not a post-launch optimization.
- Names in code match names in design. If the Figma component is `Card/Featured`, the React component is `CardFeatured` — not `FeaturedCard` or `HeroCard`.
- Commit messages are imperative, atomic, and describe the *why* when non-obvious.

## Gate 3 — Build sign-off

Closes when:

- [ ] All interaction states implemented (default, hover, focus, active, disabled)
- [ ] Core Web Vitals met on representative network: LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Keyboard navigable end-to-end on every shipped flow
- [ ] Screen reader verified on launch-critical flows
- [ ] Contrast passing (AA body, AAA legal/disclosure)
- [ ] Reduced-motion variant implemented and working
- [ ] Chrome, Firefox, Safari (desktop + iOS) verified
- [ ] No raw hex, no magic numbers, no lorem in the build
- [ ] Staging URL shared with studio for Gate-4 review

## Handoff

Once Gate 3 closes:
1. Update `workspace.manifest.yaml` `project.stage` to `04-review`.
2. Log the Gate-3 close in `decisions/decisions.md`.
3. Move to `stages/04-review/`.
