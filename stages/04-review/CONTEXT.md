<!-- ============================================================ -->
<!-- CONTEXT.md — 04 REVIEW                                       -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The contract for stage 04 of this project. Directive.        -->
<!-- Defines the scope of work and Gate-4 criteria.               -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Confirm Gate 3 has closed before running review.          -->
<!-- 2. Measure against stage-01 success criteria and stage-02    -->
<!--    specification — not against vibe.                         -->
<!-- 3. Produce reports into ./output/. Reference material in     -->
<!--    ./references/.                                            -->
<!-- 4. Every finding goes on a punch list with owner and date.   -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKFLOW.md §"04 — Review" for gate criteria.          -->
<!-- ============================================================ -->

# Stage 04 — Review

## Purpose

Hold the work against criteria set in stages 01 and 02. This is where "good enough" gets rejected. Kind, specific, unyielding.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Studio core | global via `~/.claude/CLAUDE.md` | §3 quality criteria, gates | The bar to measure against |
| Project identity | `../../WORKSPACE.md` | all | Non-negotiables |
| Canonical workflow | `../../../studio-memory/WORKFLOW.md` | §"04 — Review" | Gate-4 criteria |
| Staged build | URL from Gate 3 | all | The artifact under review |
| Gate-1 success criteria | `../01-brief/output/success-criteria.md` | all | Measure against intent |
| Gate-2 specification | `../02-design/output/` | all | Measure parity against spec |
| Voice | `../../_config/voice/` | all if populated | Copy-review reference |
| Decisions | `../../decisions/decisions.md` | relevant | Deferral log |

## Process

Run each review pass separately (see *Review passes* below) — measure against the stage-01/02 criteria, not vibe. Every finding lands on the punch list with an owner + date. Reports → `./output/`.

## Outputs (`./output/`)

- `qa-report.md` — functional issues with repro steps and severity
- `a11y-report.md` — accessibility findings with severity
- `performance-report.md` — Lighthouse or equivalent, plus real-network numbers
- `design-parity.md` — every point where build diverges from design, with verdict
- `copy-review.md` — every string checked against `_config/voice/`
- `punch-list.md` — every unresolved item with owner, target date, severity

## Review passes (run each separately — do not combine)

1. **Parity pass.** Build vs. design, screen by screen, state by state.
2. **Interaction pass.** Every five-state element verified at every breakpoint.
3. **Motion pass.** Curves, durations, triggers verified. Reduced-motion verified.
4. **A11y pass.** Keyboard path, screen reader, contrast, focus.
5. **Performance pass.** Representative network and device, not localhost.
6. **Copy pass.** Every string final. Error states, empty states, onboarding, microcopy.
7. **Edge pass.** Long names, zero data, slow networks, offline, 5xx responses.

## Working notes

- Severity is honest. "Minor" must mean minor.
- Every punch-list item has an owner and a target date. "TBD" is not a status.
- Deferred items are logged in `decisions/decisions.md` with explicit post-launch status.

## Gate 4 — Review sign-off

Closes when:

- [ ] Every punch-list item closed or logged as explicit post-launch
- [ ] Performance measured on representative network and device
- [ ] Accessibility verified with at least one assistive-tech pass (VoiceOver, NVDA, or equivalent)
- [ ] Design parity confirmed for all key screens
- [ ] Copy is final — no placeholder strings in the build
- [ ] Success criteria from Gate 1 verifiably met

## Handoff

Once Gate 4 closes:
1. Update `workspace.manifest.yaml` `project.stage` to `05-launch`.
2. Log the Gate-4 close in `decisions/decisions.md`.
3. Move to `stages/05-launch/`.
