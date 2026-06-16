<!-- ============================================================ -->
<!-- CONTEXT.md — 05 LAUNCH                                       -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- The contract for stage 05 of this project. Directive.        -->
<!-- Defines the scope of work and Close criteria.                -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- 1. Confirm Gate 4 has closed before deploying.               -->
<!-- 2. Verify every item on the pre-launch checklist.            -->
<!-- 3. Produce handoff material into ./output/. Reference        -->
<!--    material into ./references/.                              -->
<!-- 4. Treat the first 14 days post-launch as a review tail.     -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKFLOW.md §"05 — Launch" for close criteria.         -->
<!-- ============================================================ -->

# Stage 05 — Launch

## Purpose

Ship with observability in place. Hand off in a state the client or internal team can actually operate.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Studio core | global via `~/.claude/CLAUDE.md` | gates | Close criteria |
| Project identity | `../../WORKSPACE.md` | all | Non-negotiables |
| Canonical workflow | `../../../studio-memory/WORKFLOW.md` | §"05 — Launch" | Close criteria |
| Gate-4 sign-off | `../04-review/output/` | all | Precondition to deploy |
| Production access | hosting, DNS, analytics, monitoring, email, payment | as relevant | Deploy + observability |
| Decisions | `../../decisions/decisions.md` | relevant | Prior calls |

## Process

1. Confirm Gate 4 closed before deploying.
2. Verify every pre-launch checklist item (below).
3. Treat the first 14 days as a review tail — findings file against the punch list, not "v2".
4. Handoff material → `./output/`.

## Outputs (`./output/`)

- `launch-checklist.md` — the pre-launch verification, signed with date
- `deployment-notes.md` — how production is structured; how to deploy again
- `analytics-verification.md` — events firing, dashboards wired, owner per event
- `monitoring.md` — error monitoring, uptime, alerting destinations
- `handoff.md` — how the client or internal team operates this going forward
- `post-launch-log.md` — findings in the 14-day tail

## Pre-launch checklist

- [ ] Production deploy green
- [ ] Analytics events firing and verified in dashboard
- [ ] Error monitoring receiving events (test one on purpose)
- [ ] Uptime monitoring configured with on-call destination
- [ ] Redirects from legacy URLs verified
- [ ] Metadata verified: title, description, og-image, favicon, manifest
- [ ] `robots.txt` and `sitemap.xml` correct
- [ ] Legal artifacts present: privacy, cookies, terms as required
- [ ] Form submissions verified (including spam handling)
- [ ] Email flows verified (delivery, rendering, links, unsubscribe)
- [ ] 404 and 500 pages designed and deployed
- [ ] DNS, SSL, and security headers set
- [ ] Backup and rollback procedure tested

## Post-launch (first 14 days)

- Monitor analytics and error monitoring daily.
- Any finding is filed against `../04-review/output/punch-list.md` and worked. Do not treat it as "v2."
- At day 14, append a retrospective entry to `decisions/decisions.md` covering what worked, what did not, what the studio learned.

## Close

The project closes when:

- [ ] Handoff accepted by client or internal team
- [ ] 14-day tail complete with no open critical issues
- [ ] Retrospective entry logged in `decisions/decisions.md`
- [ ] `workspace.manifest.yaml` `project.stage` set to `closed` and `project.status` set to `closed`
