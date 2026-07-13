# Sprint 10 Final Report — Megs Playbook Redesign

**PR:** https://github.com/The-Shokunin-Crafthouse/megcmusic-site/pull/46 (13 commits, branch `playbook-redesign`)
**Preview URL:** https://megcmusic-site-eew9rhsw9-meggy-cb-ahn.vercel.app/megs-playbook — answers 302 → Vercel SSO for anonymous visitors (deployment protection); opens normally when signed into the `meggy-cb-ahn` team. A quietly useful property pre-merge: the private playbook surface isn't publicly reachable on the preview. Playbook data calls on the preview hit the live Supabase project, whose new tables aren't applied yet — expect the designed empty/error states there until go-live step 1.
**Status: awaiting Levi's review. Nothing merged, nothing deployed, no production env touched.**

## What shipped (all internal review loops passed)

| Piece | Where | State |
|---|---|---|
| PWA shell (manifest, Serwist SW, icons, safe-area, 430px desktop column) | `src/app/megs-playbook/`, `src/components/playbook/` | Built, tested |
| Four tab screens 1:1 from Figma + creation flow (idea, six question types, dictation, make-it-better) | `screens/`, `creation/` | Built, tested |
| Storyboard result / library / first-run (P5 designs) | `library/`, `FirstRun` | Built, tested |
| Generation queue: 4 tables + 8 API routes + zod contracts + mock fixtures | `supabase/migrations/20260713…`, `src/app/api/playbook/` | Built; **migration unapplied** |
| Local Mac daemon + launchd + 6 prompt contracts | `agent/` | Built; **untested on Meghan's Mac** |
| Tips library: 210 seed tips + guarded seed script + daemon growth/retirement | `scripts/tips-seed/`, `scripts/seed-tips.ts` | Authored; **unseeded** |
| Rule-based Next-Post recommender + weekly plan | `src/lib/playbook/{archetypes,recommend}.ts` | Built, live-verified |
| Playwright suite | `e2e/` (16 tests, iPhone 390×844) | **16/16 green** |

## Review loop results

1. **Mock-first flow** — full creation flow runs green under network-mocked Playwright (all six question types). Real-daemon `--once` round-trip NOT run (migration unapplied — see go-live).
2. **sc-verify (Gate 3)** — `gate3-verification.md`. Every locally-verifiable line passes (contrast computed, five states systemic, reduced-motion everywhere, tokens/spacing clean, 390+768 verified). **Overall FAIL until three device-side items close: CWV on the preview URL, Safari-iOS/Firefox pass, VoiceOver spot-check.**
3. **sc-design-crit** — `design-crit-p5-screens.md`. F-01 (read-then-decide storyboard order) found and applied; F-03 (library entry below the fold) logged as accepted-for-v1; no blockers.
4. **Security review** — zero high-confidence findings. Noted risk within the accepted slug-obscurity posture: anyone with the URL can enqueue generation jobs that run on Meghan's Claude subscription when the daemon is on. Mitigations if ever needed: the JWT sprint, or an allowlist check in the daemon.
5. **Playwright** — found two real bugs (apple-touch-icon never linked; a cache-seed race that broke mock-mode make-it-better/questions). Both fixed; the documenting tests converted to regression guards (`e2e/generation-race-regression.spec.ts`).

## Design-proposal checkpoints (screenshots in `stages/02-design/claude-design/playbook-redesign/`)

`01-home` … `10-first-run` — ten surfaces, mocked data, 390×844, captured post-fixes. P5-designed screens to eyeball hardest: `08-storyboard-result` (frames → titles → caption → save), `09-library`, `10-first-run`, `07-question-multiselect`.

## ADRs this sprint (decisions.md, 2026-07-12)

1. Sprint 10 architecture: PWA + local-Mac Claude daemon (reopens the Sprint-09 LLM cut via the pattern that entry said didn't exist).
2. Server-proxied polling, not client-side Supabase Realtime (anon key would make her ideas publicly readable).
3. Tips seed as reviewed JSON + idempotent script.
4. Home recommendation derived rule-based, not an LLM call.
5. Four text tokens lifted along-hue to clear AA (comp originals recorded — **visible delta vs Figma in four muted-text roles; accept or send back for comp repaint**).

## Go-live checklist (in order — none done, all need accounts this session lacks)

1. **Apply the migration** `supabase/migrations/20260713000000_playbook_generation_init.sql` to `megcmusic-outreach` (`lydxxqrhmlubanneepyl`) — Supabase SQL editor from Meghan's account, or `supabase db push` (same path as the still-unapplied 2026-07-12 outreach RLS migration — apply both).
2. **Seed tips:** `npm run playbook:seed-tips` (needs `.env.local`; refuses to double-seed).
3. **Daemon on Meghan's Mac:** clone repo → `npm install` → `agent/.env` from example (service key + `PLAYBOOK_AGENT_ENABLED=1`) → verify `claude -p "say hi"` works in her terminal → `node agent/playbook-agent.mjs --once` against a real queued job → `bash agent/install-launchd.sh` and confirm its PASS lines (`launchctl list` + log files — learning #87; the installer verifies by runtime artifacts itself). Every step honest-flagged as untested on her machine in `agent/README.md`.
4. **Device pass** (closes Gate 3): Lighthouse mobile on the preview URL (LCP/CLS/INP); install to an iPhone home screen from Safari; VoiceOver walk of the four tabs + creation flow; check dictation mic appears/hides correctly in standalone mode.
5. Optional cleanup: root `megs-playbook-redesign-prompt.md` is untracked (the copy lives at `stages/03-build/sprint-10-playbook-redesign/CONTEXT.md`).

## Honest limitations & flags

- **Old page retired wholesale** — the rules document (evidence/sources layer) and the outreach **template approve/edit UI** no longer render anywhere. Templates stay approved in the DB and the weekly run is unaffected, but Meghan has no surface to edit/approve templates until one is added (candidate: a Booking sub-screen next sprint). Data all preserved (`playbook.json`, DB).
- **Framer animations couldn't be watched in this session's sandboxed browser** (its rAF never ticks — environment). Playwright asserts transitions complete; real feel needs the device pass.
- Tip-rotation e2e asserts the UI contract; the server-side least-recently-shown selection exercises only after migration+seed.
- `daily_insight` determinism, checklist-day boundaries, and posting windows all use America/Denver.
- Weekly Cowork research task (Levi's scheduler) still writes playbook.json — the `tip_review` enqueue hook reads `meta.lastFullRun` to react to those merges; no change needed there.

## Suggested next sprints

Template-management surface (Booking sub-screen); JWT auth sprint (removes slug-obscurity + enables Realtime); daemon heartbeat surfaced on Home ("engine online" dot) so a dead Mac is visible before a job hangs.
