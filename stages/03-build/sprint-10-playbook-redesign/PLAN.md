# Sprint 10 — Megs Playbook Redesign: Build Plan (P0 output)

Contract: `CONTEXT.md` (this folder — the full brief). Branch: `playbook-redesign`. Finish = PR + report, never merge/deploy.

## Repo facts the build hangs on

- **Figma source:** file `908TLdOM0e6xRtnzOj2nNv`, page `0:1` (Sandbox). Playbook frames: `155:2` Home, `155:213` Stats, `155:303` Booking, `155:391` / `155:1038` / `155:1143` (all named "Mobile - Megs Playbook Checklist" — one is the Checklist screen, the others are the creation-flow comps: idea entry + question multiselect; P1 identifies by content).
- **DB:** Supabase project `megcmusic-outreach` (Meghan's account, ref `lydxxqrhmlubanneepyl`), reached ONLY server-side via `src/lib/api/appDb.ts` (service role, lazy env validation). No client-side Supabase exists anywhere.
- **Migration conventions:** `supabase/migrations/YYYYMMDDHHMMSS_name.sql`; every table gets `grant all on table <t> to service_role;`; newest posture (2026-07-12 ADR) = RLS **on** with explicit `for all to service_role using (true) with check (true)` policy (defense in depth).
- **Route conventions:** `src/app/api/playbook/*` route handlers; `src/lib/playbook/http.ts` (`ok`/`fail`/`hasCronSecret`); page-facing reads/writes unguarded (slug obscurity — logged posture), machine/cron writes secret-guarded.
- **Existing plumbing reused, not rebuilt:** `sp_posts`/`sp_metric_snapshots`/`sp_sync_runs` + `src/lib/playbook/{meta,scoring,types}.ts` (stats); outreach tables + `src/app/api/outreach/*` (booking pipeline); `src/data/playbook.json` v2 (action/insight/checklist) + daily sync.
- **Tokens:** `_config/design-system/token-map.css` is the only legal home for raw values. New `--pb-*` namespace, isolated dark palette for this surface. `--mc-focus-ring` (#241420) ≈ dark grounds — precedent says use a dedicated `--pb-focus-ring` sized for AA on the pb dark bg.
- **Vercel previews:** CI-only (`preview-deploy.yml` sticky comment, `…-meggy-cb-ahn.vercel.app`). Never local `vercel deploy`.
- **Top chrome hazard (LEARNINGS 2026-07-05):** global SiteChrome logo bleeds to ~83px top-left + fixed Menu top-right on every route. The PWA shell must opt out or clear it — resolve in P3 (route-group layout that omits SiteChrome is the clean path; log ADR).

## Resolved conflict → ADR at commit time

Brief §2 says "PWA subscribes to the job row via Supabase Realtime (fallback: polling capped at 2min)". Client-side Realtime requires shipping `NEXT_PUBLIC_SUPABASE_*` anon credentials and RLS select policies on `generation_jobs` — on an unauthenticated, slug-obscurity route that makes job rows (Meghan's ideas, storyboards) publicly readable, violating §6's own security bar and the repo's zero-client-Supabase posture. **Decision: server-proxied polling only** — the client polls `GET /api/playbook/jobs/[id]` at 2.5s while a job is active (well under the 2min cap the brief itself sanctions), stops on terminal status. Realtime can be revisited if the page ever gains real auth (JWT sprint).

## Phase order

P1 (Figma spec+tokens, Sonnet) ∥ P2 (migrations+API, Sonnet) → P3 (shell, Sonnet) → P4 (screens 1–6, Sonnet ∥ per screen) → P5 (Fable designs 7–10 → Sonnet implements) → P6 (daemon Sonnet, prompts Fable) ∥ P7 (tips, Fable) → P8 (reviews, Playwright, PR, report).

Fable reviews every subagent diff before the next phase; two failed acceptance loops → Fable takes the step over.

## New deps (add at first use)

`zod` (job payload validation), `@serwist/next` + `serwist` (service worker), `@tanstack/react-query` (server state). Framer Motion / Zustand already present.
