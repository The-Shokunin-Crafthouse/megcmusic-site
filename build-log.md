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
