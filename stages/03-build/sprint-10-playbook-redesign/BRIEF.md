# SPRINT — Megs Playbook Redesign: iOS-feel PWA + Claude creation flow

You are building the full redesign of `/megs-playbook` in this repo (megcmusic-site) in one continuous run, with internal review loops, ending in a PR and a report for Levi's review. You do NOT deploy to production or merge. Read this entire brief before writing any code.

## 0a. Model routing — read first

This session runs on **Fable** as the orchestrator, but Fable does only the work that needs Fable. Everything else is delegated to **Sonnet 5 subagents** via the Task tool with an explicit model override (`model: sonnet`). Follow this routing exactly:

| Step | Model | Effort | Why |
|---|---|---|---|
| P0 Planning pass (read repo/Figma, write the build plan + task list) | Fable | high | Cross-cutting judgment over existing decisions |
| P1 Figma extraction → spec docs + `--pb-*` tokens | Sonnet 5 subagent | medium | Mechanical read-and-transcribe |
| P2 Migrations, tips/jobs tables, API routes | Sonnet 5 subagent | medium | Fully specified below |
| P3 PWA shell, nav, stack navigator, motion primitives | Sonnet 5 subagent | high | Specified in §7; motion values given |
| P4 Screens 1–6 (comped in Figma) | Sonnet 5 subagents (one per screen, parallel where independent) | medium | 1:1 from Figma specs |
| P5 Proposed screens 7–10 — **design** (layout, hierarchy, states, written spec) | Fable | high | Original design in the comps' language |
| P5 Proposed screens 7–10 — **implementation** of Fable's written spec | Sonnet 5 subagent | medium | Spec makes it mechanical |
| P6 Local daemon + generation prompts | Sonnet 5 subagent | high | Contract in §5; prompts drafted by Fable |
| P6 `agent/prompts/*` authoring (questions/storyboard/tips prompt design) | Fable | high | Prompt quality drives product quality |
| P7 Tips seed library (200+ tips) | Fable | high | Creative, grounded, non-generic — the product's voice |
| P8 Review loops: `sc-verify`, `sc-design-crit`, `/security-review`, final report | Fable | high | Evaluator passes are Fable's job (studio rule) |
| P8 Playwright test authoring + runs, mock fixtures | Sonnet 5 subagent | medium | Deterministic from the flow spec |

Rules: every Sonnet subagent gets a self-contained task brief (paths, token names, acceptance checks — never "see above"); Fable reviews each subagent's diff before moving on; if a Sonnet subagent fails the same acceptance check twice, Fable takes that step over rather than looping.

## 0b. Required reading (in order)

1. `WORKSPACE.md`, `../studio-memory/WORKFLOW.md`, `decisions/decisions.md` — especially these entries: "Meta Graph API access: System User token" (2026-07-10), "Booking Outreach engine added to /megs-playbook" (2026-07-05), "playbook.json schema v2" (2026-07-10), "Sprint 09: LLM generation features cut" (2026-07-10), "Client project: isolated token system" (2026-06-16).
2. **Figma is the design source of truth:** https://www.figma.com/design/908TLdOM0e6xRtnzOj2nNv/MegCMusic?node-id=155-2 — pull every UI spec from here via the Figma MCP. Load the `figma-design-to-code` skill first, then `get_design_context` + `get_screenshot` on node `155-2` and each screen frame under it, and `get_variable_defs` for tokens. Exact values from Figma win over the reference PNG (`stages/02-design/references/megs-playbook-comps.png`, fallback only). If the Figma MCP is not connected, STOP and ask. **P1 must write what it extracts to `stages/02-design/output/playbook-redesign-spec.md` (per-screen: layout, spacing, type styles, colors, components, states) — later Sonnet steps work from that doc, not from re-reading Figma.**
3. `_config/design-system/token-map.css` — the client token system. All color/type/spacing flows from here. Extend it; never bypass it.
4. `src/app/megs-playbook/` — the current implementation being replaced, and `src/app/api/{playbook,booking,outreach}` — existing plumbing you must reuse, not rebuild.

## 1. What this is

Meghan's private social-media co-pilot, redesigned as a mobile-first PWA that feels like a native iOS app: installed to her home screen from megcmusic.com, screen-to-screen push/pop transitions, springs, safe-area aware, no browser chrome. Four main surfaces plus a guided AI creation flow that walks her from "I have an idea" to a finished storyboard with post-title options and per-frame asset-generation prompts.

The AI engine is her Claude Code subscription running on her machine: the PWA never calls an LLM API directly. It writes a job to Supabase; a local daemon on her Mac picks it up, runs `claude -p`, and streams results back into Supabase. (Same operating pattern as Levi's health dashboard; solves the Sprint-09 "no free auth path on Vercel" cut.)

## 2. Architecture (decided — log ADRs via sc-adr, don't reopen)

- **Hosting:** the PWA stays at `/megs-playbook` on Vercel (existing unlinked, noindexed route). Vercel provides the HTTPS required for service-worker install. No tunnel, no local web server for the UI.
- **Stats:** existing Meta Graph API integration (System User token, `META_SYSTEM_USER_TOKEN`) and its sync. Reuse the existing data; extend the sync only if a screen needs a metric it doesn't store.
- **Booking pipeline:** existing Supabase tables + Gmail outreach engine. The Booking screen reads what exists.
- **Checklist / daily insight:** existing `playbook.json` v2 (action/insight/checklist) + daily sync.
- **Generation queue:** new Supabase tables:
  - `generation_jobs`: `id uuid pk default gen_random_uuid()`, `kind text check (kind in ('questions','storyboard','make_it_better','titles','tip_derivation','tip_review'))`, `status text check (status in ('queued','running','streaming','done','error')) default 'queued'`, `input jsonb not null`, `output jsonb`, `error text`, `created_at/updated_at timestamptz default now()`.
  - `storyboards`: `id uuid pk`, `idea text`, `answers jsonb`, `frames jsonb`, `title_options jsonb`, `chosen_title text`, `caption text`, `posting_window text`, `created_at timestamptz`.
  - Every migration includes `grant all on table <t> to service_role;` (studio learning #5) and RLS appropriate to the existing playbook access pattern.
- **Local daemon:** `agent/` directory in this repo — a Node daemon (`playbook-agent.mjs`) that polls `generation_jobs` for `queued` rows every 5s (Supabase service key from local `agent/.env`, gitignored, never committed), claims one job at a time (`update ... where status='queued' ... returning`, ordered by created_at), spawns `claude -p --output-format stream-json`, streams partial output into `output` with status `streaming`, finalizes to `done`/`error`. Include: 2× retry with backoff on spawn failure, a launchd plist + install script, and `--once` mode for testing. Apply studio learnings #86/#87 (verify launchd by runtime artifacts: StandardOut/ErrorPath files + `launchctl list`) and #73 (positive default-off flag: `PLAYBOOK_AGENT_ENABLED`). Document setup in `agent/README.md`.
- **Client data flow:** PWA subscribes to the job row via Supabase Realtime (fallback: polling capped at 2min, learning #68). Generation takes 30s–2min — design the wait: streaming progress states, never a bare spinner.
- **State:** Zustand for the creation-flow state machine; server data via TanStack Query.
- **Motion:** Framer Motion, philosophy **Systemic Restraint** — load `sc-motion-restraint` for every session that touches motion. Concrete values in §7. Reduced-motion delivers instant cuts, fully functional.
- **PWA:** manifest (standalone, portrait, `theme_color` from `--pb-` bg token), Serwist service worker (app-shell precache, network-first data, offline shell), apple-touch-icon set, `viewport-fit=cover` + safe-area insets (`env(safe-area-inset-*)` on nav bar and take-over screens), `overscroll-behavior: none` on the shell, 44×44 touch targets. Below-fold defer to guard CLS (#54).

## 3. Screens

### From the Figma comps (build 1:1 from the P1 spec doc; tokens extracted from Figma variables/styles into token-map.css as a `--pb-*` namespace — this surface has its own dark palette; keep it isolated from the public-site tokens)

1. **Home** — Daily Insight card; "Your Next Post" recommendation (large type) with "Let's go!" (launches creation flow seeded with the recommendation) and "Why this works?" (expandable detail — Fable proposes the design in P5); Last Post stats (ratio/reach/engagement) with "What worked" analysis.
2. **Stats** — filter chips (All Time / Last Week / Reach / Engagement / Score); post cards with avatar, ratio/reach/engagement, title, Post/Reel tag, date, "Show Insight" expandable (P5).
3. **Booking** — filter chips (New / Replied / Category); Daily Insight (business); Pipeline list of venues with contacts/venue-type/city/frequency/category. Tapping a venue opens a detail sheet (P5: contact info, outreach history from the outreach engine, reply status, next action).
4. **Checklist** — tabs Checklist / Instagram / Facebook; check-off items persisted per day (a `checklist_state` keyed by date — localStorage is not enough, store in Supabase so it survives reinstall). IG/FB tab content from what `playbook.json` v2 already carries (P5 proposes layout).
5. **Creation flow — idea entry** ("What's your idea?") — full-screen green take-over, textarea, mic (Web Speech API dictation if available in iOS standalone mode; feature-detect and hide the mic if unsupported — verify at runtime, don't assume), "Generate Storyboard" and "Make it better" (Claude sharpens her idea via a `make_it_better` job; show before/after with accept/revert).
6. **Creation flow — question pages** — the multiselect comp is the pattern; build a question ENGINE, not hardcoded pages, rendered from this schema (Claude generates 3–6 questions per job):
   ```json
   { "id": "q1", "type": "multiselect|single|text_short|text_long|yes_no|scale",
     "question": "…", "options": ["…"], "min": 1, "max": 5, "required": true }
   ```
   Flow: Back/Next, progress indication, Exit (confirm + save draft to Zustand-persisted storage). Each type gets its own comp-consistent layout: single-select = same rows with radio affordance; text = the white card from the idea screen; yes/no = two large buttons; scale = five tap targets with labels.

### Proposed screens — Fable designs (P5), Sonnet implements, and they are review checkpoints (§6)

7. **Storyboard result** — the core deliverable: scene/frame cards (hook → body → CTA structure), each frame with description, on-screen text, and a copy-ready asset-generation prompt (tap-to-copy); title options (3–5) as selectable cards; regenerate-frame and regenerate-titles actions (new jobs); save to library.
8. **Storyboard library** — past storyboards, revisit/duplicate.
9. **Nav shell** — bottom bar from the comps (lightbulb + lightning/sparkle/list = Home/Stats/Booking/Checklist as inferred; keep the organic curved motif). Creation flow is a modal stack over everything.
10. Empty states, error states, first-run screen. All four async states everywhere (idle/loading/error/empty).

Fable's P5 output: a written spec per screen (structure, spacing in `--pb-*` tokens, states, motion) saved to `stages/02-design/claude-design/playbook-redesign/specs.md` before implementation starts.

## 4. Tips & insights system (Daily Insight, "Why this works", stat insights, booking insights, checklist blurbs)

Every tip surface draws from one living library — never hardcoded strings, never a small array that visibly repeats.

- **Store:** Supabase table `tips` (`id`, `surface text check (surface in ('daily_insight','why_this_works','stat_insight','booking_insight','checklist'))`, `body text`, `context_tags text[]`, `source text check (source in ('seed','post_derived','rule_derived'))`, `derived_from_media_id text`, `active boolean default true`, `times_shown int default 0`, `last_shown_at timestamptz`, `created_at timestamptz default now()`). Same RLS/grant discipline as the other tables. (Build: Sonnet P2.)
- **Seed library — Fable authors (P7):** **200+ tips minimum** (≥50 daily insights, ≥40 booking, ≥40 stat, ≥40 why-this-works, ≥30 checklist), grounded in `playbook.json` v2 rules and Meghan's real stats — specific, actionable, in her register; no generic social-media filler ("post consistently!" is banned). Ship as a reviewed seed script (`sql/` or `scripts/` per repo convention), and include the seed file in the review checkpoints so Levi can read every tip.
- **Selection — no staleness, no repeats:** per surface, pick least-recently-shown among `active` rows matching context tags, tie-broken randomly; `daily_insight` is deterministic per calendar day (seeded by date string) so it doesn't change on refresh. Update `times_shown`/`last_shown_at` server-side on serve. `why_this_works` additionally matches the current recommendation's `context_tags`.
- **Growth:** daemon job kind `tip_derivation` — when the daily stats sync lands a new post's metrics, enqueue one automatically; Claude writes 2–4 new tips from that post's actual performance (concrete numbers), tagged `post_derived`. Before insert, Claude receives the nearest existing tips for that surface and returns only genuinely new ones (dedupe by meaning, not string match).
- **Retirement:** when the weekly playbook.json sync changes a rule, enqueue `tip_review` to deactivate (`active=false`, never delete) contradicted tips.

## 5. The generation contract

Fable designs the `claude -p` prompts (in `agent/prompts/`, P6) to return strict JSON (validate with zod; on parse failure retry once with repair instructions, then error the job):
- **Tip-derivation job:** new post metrics + nearest existing tips → 2–4 new deduplicated tips (see §4).
- **Questions job:** given idea + recent stats context (top/bottom performers from existing data) → 3–6 questions in the §3.6 schema.
- **Storyboard job:** given idea + answers + stats context → storyboard (4–8 frames: description, on-screen text, asset prompt per frame), 3–5 title options with rationale, hashtag/caption suggestion, best posting window (from playbook.json rules).
- **Make-it-better job:** idea → sharpened idea + one-line why.

## 6. Process, reviews, and the finish line

- Work on a feature branch (`playbook-redesign`), atomic imperative commits, PR at the end — never push main (protected, learning #43). Confirm you're on main and synced before branching.
- Log every crystallized decision via `sc-adr` to `decisions/decisions.md`. Update `workspace.manifest.yaml` for the new `agent/` top-level folder.
- **Internal review loops (all must pass before you report done):**
  1. Build with mock jobs first (`MOCK_GENERATION=1` returns canned JSON fixtures committed under `src/app/megs-playbook/__fixtures__/`) so the whole flow is testable without the daemon; then wire the real daemon and verify with `agent/playbook-agent.mjs --once` against a real queued job.
  2. `sc-verify` (Fable) — full Gate-3 checklist: 5 interaction states, keyboard + screen-reader paths, contrast (AA body), reduced-motion, CWV budgets, breakpoints 390/768 (mobile-first; desktop gets a centered 430px max-width shell, not a redesign).
  3. `sc-design-crit` (Fable) on the P5 proposed screens.
  4. `/security-review` (Fable) on the pending changes — especially RLS/grants on the new tables, that the service key never reaches the client, and that generation endpoints require the existing playbook access pattern.
  5. Playwright pass (Sonnet authors/runs) at iPhone viewport (390×844, deviceScaleFactor 3): install metadata present, full creation flow with mocks (all six question types), transitions render, checklist persists across reload, back/exit behavior, tip rotation (two consecutive serves differ).
- **Design-proposal checkpoints:** render each P5 screen with mock data and screenshot into `stages/02-design/claude-design/playbook-redesign/`. Call these out explicitly in the final report.
- **Finish = report, not go-live.** End with: PR link, preview URL, screenshots of every screen, the ADR list, the tips seed file location, daemon install instructions (untested steps flagged honestly — learning #45: never claim delivery you didn't verify at the destination), and an explicit "awaiting Levi's review" list. Do not merge. Do not touch production env vars.

## 7. Motion & interaction spec (so P3/P4 need no judgment calls)

- **Stack navigator:** tab switches = crossfade + 8px y-shift, 220ms ease-out. Creation-flow push = incoming screen spring from `x: 100%` (stiffness 400, damping 40), outgoing parallax to `x: -24%` + slight dim; pop reverses. Modal take-overs (idea entry) rise from bottom, spring stiffness 400 damping 34.
- **Touch affordances:** studio tap-scale spring — scale to 0.92 on pointerdown, ≤220ms, spring (learning #17). Bottom sheets: snap-based, popmotion-style spring k400 d25, drag-to-dismiss, capture-phase outside-tap dismiss, no scrim (learning #16).
- **Generation wait:** staged progress narrative bound to job status (`queued` → "Warming up…", `streaming` → show frames/questions as they arrive one by one with a 60ms stagger, ease-out entrances). Never a bare spinner.
- **Focus:** every interactive element has a styled `:focus-visible` ring via a `--pb-focus-ring` token (check contrast against the dark ground — learning #32; don't reuse a token that equals the bg, precedent in decisions.md).
- **Checkbox check-off:** spring scale-pop on the check + 120ms accent flash; list item settles, no layout shift.
- Durations: 120ms micro / 220ms standard / 450ms orchestrated; anything longer justifies itself in writing.

## 8. Anti-defaults reminder

No Tailwind (client decision), no raw hex outside token-map.css, no preset shadows/radii, no lorem — write Meghan's real copy in her register (warm, direct, musician-to-musician), no bare spinners, no unstyled focus rings. If a layout could be anyone's, it is no one's.
