<!-- ============================================================ -->
<!-- CONTEXT.md — 01 BRIEF                                        -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The contract for stage 01 of this project. Directive.        -->
<!-- Defines the scope of work and Gate-1 criteria.               -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Confirm WORKSPACE.md and WORKFLOW.md have been loaded.    -->
<!-- 2. Work only within this stage's scope until Gate 1 closes.  -->
<!-- 3. Produce outputs into ./output/. Reference material into   -->
<!--    ./references/.                                            -->
<!-- 4. Do not begin stage-02 work from this stage.               -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKFLOW.md §"01 — Brief" for gate criteria.           -->
<!-- ============================================================ -->

# Stage 01 — Brief

## Purpose

Establish direction, scope, constraints, and reference sensibility before any pixel or line of code. The goal is a document the design stage can build from without improvisation.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Studio core | global via `~/.claude/CLAUDE.md` | principles, gates, quality bar | Loaded globally |
| Project identity | `../../WORKSPACE.md` | all | Non-negotiables to confirm the brief against |
| Canonical workflow | `../../../studio-memory/WORKFLOW.md` | §"01 — Brief" | Gate-1 criteria |
| Source material | `./references/` | all | Client conversations, pre-existing brand/voice/tech material |
| Precedent audit | `./references/` | as gathered | Competitor + precedent analysis |
| Decisions | `../../decisions/decisions.md` | relevant | Prior calls; do not reopen without reason |

## Process

1. Confirm `WORKSPACE.md` + canonical `WORKFLOW.md` are loaded.
2. Work only within stage-01 scope until Gate 1 closes — writing is the work; resist visuals.
3. Capture client language verbatim where phrasing encodes the ask.
4. Brief / scope / success-criteria / references / risks → `./output/`; raw material → `./references/`.

## Outputs (`./output/`)

- `brief.md` — narrative project brief
- `scope.md` — in / out statement, explicit
- `success-criteria.md` — felt + measurable
- `references.md` — curated reference board with notes on what each reference teaches
- `risks.md` — risk register (constraint, likelihood, mitigation, owner)

## Working notes

- Writing is the work at this stage. Resist jumping to visuals.
- "We'll figure it out in design" is not an acceptable stance. Figure it out here.
- Capture client language verbatim where it matters — word-level phrasing often encodes the actual ask.
- References are instructive, not aspirational. For each reference, write one sentence on *what it teaches* and one on *what it does not*.

## Gate 1 — Concept sign-off

Closes when:

- [ ] Direction is written and agreed with the client
- [ ] Scope is defined; out-of-scope items are named explicitly
- [ ] Success criteria are specific enough to verify at review
- [ ] Reference sensibility is aligned — client has seen and confirmed
- [ ] Non-negotiables in WORKSPACE.md confirmed against this project
- [ ] Risks are logged with mitigations

## Handoff

Once Gate 1 closes:
1. Update `workspace.manifest.yaml` `project.stage` to `02-design`.
2. Log the Gate-1 close in `decisions/decisions.md`.
3. Move to `stages/02-design/`.
