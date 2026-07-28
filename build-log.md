# BUILD LOG — megcmusic-site

> Append-only sprint log. One entry per sprint/phase, written after merge. Captures
> what shipped, key decisions (cross-ref `decisions/decisions.md`), problems hit,
> and how they resolved. Not loaded as agent context.

---

---

## Sprint 2 — Floating nav + full-bleed hero
**Closed:** 2026-06-16
**Commits:** `feat(sprint-02): floating nav + full-bleed hero` (3da5756)

**What shipped:**
- Floating pill nav (desktop full-width; mobile single-row pill, no hamburger — ADR 2026-06-16 "Mobile nav")
- Full-bleed hero: combined pick+lockup SVG (real Figma vector), client landscape photo, Framer Motion entrance
- Token additions: nav underline, pill radius, micro motion, focus ring (ADR 2026-06-16 "Sprint-2 token additions")

**Key decisions:**
- Client-isolated token system, no Shokunin shared design system (ADR 2026-06-16 "Client project: isolated token system")
- Google Fonts via CSS `@import` in `globals.css` — deferred to Gate 3 self-host pass (ADR 2026-06-16 "Web fonts via Google Fonts @import")
- Asset strategy: local files, hand-authored pick SVG, exported name-lockup vector (ADR 2026-06-16 "Sprint-2 asset strategy")
- Combined pick+lockup SVG superseded the two-element approach (ADR 2026-06-16 "Hero decoration: one combined SVG")
- Previews are Vercel subdomain deploys, not `/_previews/[N]/` (ADR 2026-06-16 "Previews are Vercel subdomain deploys")

**Tier-1 learnings added:** None captured at Sprint 2 close (backfilled here).

---

## Sprint 3 — Shows section (tabbed cards, Events API)
**Closed:** 2026-06-17
**Commits:** `feat(sprint-03): shows section with tabbed date list` (aaaea57) · `fix(sprint-03): bound Events API fetches` (ddb8458) · `fix(sprint-03): match Figma card — real pick vector, 19px padding, date in pick` (67c4c61) · `style(sprint-03): open 6px breathing room between month and day` (b7aa0b5) · `fix: load Google Fonts via <link> not CSS @import` (d3a9f62)

**What shipped:**
- Shows section on `/` — three tabs (Up Next / Just Added / Past), ISR 1h
- Tabbed show cards: Figma-faithful pick badge (real 39:24 vector, exact geometry), venue link with Maps, stretched-link whole-card click, AA-passing venue color
- Just Added tab: upcoming sorted by WP `date` field newest-first, fallback to Up Next ordering
- Empty state for zero upcoming events
- Google Fonts font-loading bug resolved (fonts were silently absent site-wide from Sprint 2 onward)

**Key decisions:**
- Sprint scope bounded to Shows section on `/`; hero scroll-pin, detail page, `/shows` listing deferred (ADR 2026-06-16 "Sprint-3 scope")
- Token additions: card radius, shadow, divider, max-width, type ramp (ADR 2026-06-16 "Sprint-3 token additions")
- Just Added tab + whole-card / venue link interaction pattern (ADR 2026-06-16 "Just Added tab ordering")
- Venue red: `--mc-accent-red-ink` at 4.85:1 for text, base `--mc-accent-red` for fills (ADR 2026-06-16 "Venue red gets a darker -ink token")
- Events API fetch bounded with `AbortSignal.timeout(12000)` + `staticPageGenerationTimeout: 120` (ADR 2026-06-16 "Bound Events API calls")
- Card fidelity pass: exact Figma pick vector + 19px padding supersedes 8pt snap (ADR 2026-06-16 "Card fidelity pass")
- Google Fonts moved from CSS `@import` to `<link>` in `layout.tsx` (ADR 2026-06-17 "Google Fonts via `<link>`")

**Tier-1 learnings added:** See `LEARNINGS.md` — four entries:
1. Turbopack silently strips external CSS `@import url()`
2. Bound ISR server fetches with `AbortSignal.timeout`
3. Tokenize off-grid Figma values when client has signed off the spec
4. Add `-ink` token variant when a brand fill color fails AA as text

---

## Sprint 04 — /shows Listing
**Closed:** 2026-07-01 (approved, Levi Bahn)
*(Entry written retroactively 2026-07-12 by the COO apply pass — Flag 16; reconstructed from the sprint CONTEXT.md and decisions.md 2026-07-01 entries.)*

**What shipped:** `/shows` grown from the Sprint-3 home section into a full destination — every upcoming and past date, cream tickets on deep plum, extending the Sprint-3 vocabulary (mask / tabs / card nodes) with no new visual language. Page header carries the ★★★ brand motif with no new tokens; nav active state became route-aware.

**Key decisions (see decisions.md 2026-07-01):** show pipeline email → WP → Bandsintown via a standalone GitHub Action; past-shows pagination as backward-walk through a same-origin proxy.

---

## Sprint 05 — /shows Archive Enhancements
**Closed:** 2026-07-02 (approved, Levi Bahn — live directive after the Sprint-4 preview)
*(Entry written retroactively 2026-07-12 by the COO apply pass — Flag 16; reconstructed from the sprint CONTEXT.md and decisions.md 2026-07-02 entries.)*

**What shipped:** search filtering the active tab live (with a written empty-search state), numbered pagination with a 20/50/100 page-size dropdown (keyboard-operable, five states), per-show add-to-calendar via `add-to-calendar-button`, persistent site chrome with the full-screen portrait backdrop extended to `/shows`, and the mobile treatment (Menu overlay, lazy-load, search-as-icon).

**Scope reversals (logged in decisions.md):** search and numbered pagination — anti-defaults in Sprint 4 — reversed by live directive; the full archive now loads at build, retiring the `/api/shows/past` proxy and "Show more" append.

---

## Sprint 10 — Megs Playbook Redesign (iOS-feel PWA + Claude generation daemon)
**Build merged:** 2026-07-23 → 2026-07-26 (PRs #46, #57, #58, #59, #61, #62, #63)
**Go-live + Gate-3 verification pass:** 2026-07-28
**Status at close: Gate 3 FAIL — one measured failure (LCP) and three items needing hardware.**

**What shipped:** `/megs-playbook` rebuilt from a static rules document into a mobile-first installable PWA — four surfaces (Home, Stats, Booking, Checklist), a guided AI creation flow entered from the corner pick, a storyboard library, and a local-Mac Claude daemon (`agent/playbook-agent.mjs`) that runs generation under Meghan's own subscription via a Supabase job queue. Motion runs Systemic Restraint everywhere except the creation take-over, which runs Cinematic Direction by direction (ADR 2026-07-22).

**What the go-live pass found and fixed.**

1. **Nothing had ever been live.** Every Production Deploy since PR #46 (2026-07-23) failed at a `npm ci` step that sat in front of a remote Vercel build — ten consecutive red runs across five days, invisible because local installs and PR previews both stayed green and a failed post-merge deploy raises no red check on any PR. Fixed by regenerating the lockfile for npm 10 and deleting the dead preflight step (PR #66, ADR 2026-07-28). The learning-#94 shape, at the deploy tier.
2. **Tips were never seeded.** The live `tips` table held 3 `post_derived` rows and none of the 210 reviewed seeds. Seeded and verified at the destination: 52/42/42/42/32 per surface, 213 total.
3. **First CWV measurement failed both budgets.** CLS 0.394 (all of it Home's in-flow skeletons re-flowing when data lands) — fixed to 0 by rendering the boot column out of flow (PR #67, learning #54). LCP 6.8s — architectural, surfaced as an owner scope call rather than absorbed (ADR 2026-07-28).
4. **The daemon round-trip is real.** A production `questions` job was claimed by the LaunchAgent on Meghan's Mac and completed `queued → streaming → done` with no error — closing the item the 2026-07-12 verification listed as unverifiable.

**Key decisions:** see `decisions/decisions.md` — the Sprint-10 architecture ADR (2026-07-12), the LaunchDaemon → LaunchAgent correction (2026-07-24), model/effort pinning (2026-07-24), the three deferred daemon fixes taken (2026-07-26), the chosen-title read loop (2026-07-26), and the two 2026-07-28 go-live entries above.

**Open at close (each needs something this session could not reach):** the LCP scope call (Levi); the installed-PWA walk on a physical iPhone (Meghan's phone); a real VoiceOver spot-check (interactive session); daemon reboot survival (access to Meghan's Mac); and — surfaced, not fixed — production deploys still send no failure notification, which is what turned a one-line lockfile problem into a five-day outage.
