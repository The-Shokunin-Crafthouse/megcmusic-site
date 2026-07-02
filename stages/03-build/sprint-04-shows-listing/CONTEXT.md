# Sprint 04 — /shows Listing
**Status:** approved (2026-07-01, Levi Bahn)
**Figma source:** file `908TLdOM0e6xRtnzOj2nNv` — no dedicated /shows frame exists; the page extends the Sprint-3 vocabulary (nodes `39:12` mask, `39:15` tabs, `39:22` card) to a full surface. Logged as the design basis; a new frame is welcome but not blocking.
**Breakpoints:** 390 / 768 / 1024 / 1440

---

## Inputs
| File | Sections to load |
|------|-----------------|
| `WORKSPACE.md` | All |
| `_config/design-system/token-map.css` | All |
| `studio-memory.md` | §2 Design Principles, §3 Quality Criteria, Anti-defaults |
| `~/Projects/shokunin-crafthouse/studio-memory/playbooks/slop-blocklist.md` | All |
| `decisions/decisions.md` | Sprint-3 entries (scope deferral, token additions, tab ordering, venue `-ink`, API timeout) |
| `stages/03-build/sprint-03-shows/CONTEXT.md` | Contract + design specs (component vocabulary source) |
| `src/components/ShowsSection/*`, `src/components/ShowCard/*` | All — reuse, do not fork |
| `src/lib/api/events.ts` | All |
| `src/lib/datetime.ts` | All |

---

## POV
The full tour archive, same front porch. `/shows` is the Sprint-3 section grown into a destination: every date she's playing and every date she's played, warm cream tickets on deep plum, no new visual vocabulary invented. The page earns its existence by being complete — the home section is the trailer, this is the record. Not a generic events archive; density read as a working musician's history.

---

## Contract

**Proposed:** 2026-07-01. Scope = a native **`/shows` route** — the "See all shows" destination — reusing the Sprint-3 components without forking them. Third of the three deferred Sprint-3 follow-ons; chosen first because it reuses everything shipped in Sprint 3, has no Gate-2 gap, and retires an off-site link. (Event detail waits on venue assignment in WP; hero scroll-pin waits on its Gate-2 motion spec.)

### Build
- **`app/shows/page.tsx`** (server) — `getEvents('upcoming')` + `getEvents('past')` in try/catch → `[]`; ISR `revalidate: 3600`; route `metadata` (title "Shows — MegCMusic", real description — copy is design). Renders page header + `ShowsSection`.
- **Page header** — Lora display heading using the existing type ramp; ★★★ section-label pattern per brand. No new tokens expected; if one is needed it goes to `token-map.css` via sc-adr, never raw in the module.
- **`ShowsSection`** — extend, don't fork: accept a `variant`/`limit` prop so home keeps the 7-row cap and `/shows` lifts it. Tablist behaviour (APG roving tabindex, ←/→, `aria-selected`/`aria-controls`), per-tab empty states, and entrance motion carry over unchanged.
- **Full listing:** Up Next and Just Added render all upcoming events. Past Shows paginates — fetch `per_page` pages from the tribe API as needed; UI is a "Show more" append (no page-number widget, no infinite scroll). Page size and total-pages handling confirmed against the live payload at build; risks below.
- **Link updates:** home "See all shows" → `/shows` (retires `https://www.megcmusic.com/events/`); nav "Shows" → `/shows`. Card links stay on `event.url` (WP event page) until the detail-page sprint lands — swap then happens in `ShowCard` alone.

### Behaviour
- Entrance: Sprint-3 row animation (translateY + scale .8→1, staggered) replays on tab switch; "Show more" appends animate in; `prefers-reduced-motion` → instant, functional.
- Keyboard: tabs, card links, venue links, Show more — all focusable, five states each.
- Empty states: per-tab copy carried from Sprint 3; Past Shows empty state written (real copy).
- Tokens only; asset paths relative; no raw hex.

### Explicitly out of scope
- Native event detail page (own sprint; prerequisite: venues assigned in WP — request sent to Meg).
- Hero scroll-pin + scroll-release (own sprint; prerequisite: Gate-2 motion spec).
- Filtering/search/year grouping on the archive — not in any request; add only via a logged scope decision.

### Known risks
- **Tribe pagination shape** — `total`/`total_pages` headers vs body fields must be confirmed against the live API before the Show more implementation; the 12s `AbortSignal.timeout` (2026-06-16 ADR) applies to every page fetch.
- **Past-shows volume** — unknown archive depth; if the payload is large, first page renders at build and further pages load client-side on demand. Build must never hang (same ADR).
- **Nav active state** — nav gains its first non-`/` route; the cream active-underline (`--mc-nav-underline`) must reflect the current route. Small, but it's the first time the nav is route-aware.

---

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Implemented sprint | `src/` (feature branch `feat/sprint-04-shows-listing`) | Code |
| Snapshots | `/previews/sprint-04-shows-listing/` | PNG |
| Sprint artifacts | `stages/03-build/sprint-04-shows-listing/output/` | Notes, evaluator report |

---

## Audit checklist
- [ ] `/shows` renders live data at build; try/catch → empty state, build never breaks on an API hiccup
- [ ] Home section unchanged at 7-row cap; `/shows` lifts it (all upcoming; past paginated)
- [ ] "Show more" fetches and appends further past pages; keyboard-operable; five states
- [ ] Home "See all shows" and nav "Shows" → `/shows`; no remaining link to `megcmusic.com/events/`
- [ ] Nav active-underline reflects the `/shows` route
- [ ] Tabs keep APG behaviour (roving tabindex, ←/→) on the new page
- [ ] Entrance motion replays on tab switch and on appended rows; reduced-motion instant + functional
- [ ] Route metadata present (title, description — real copy)
- [ ] No raw hex, no ad-hoc sizes — tokens only; any new token logged via sc-adr
- [ ] No AI-default patterns (page-number pagination widget, infinite scroll, generic archive header)
- [ ] Asset paths relative
- [ ] Verified 390 / 768 / 1024 / 1440
- [ ] `npm run build` exits 0; preview snapshots show the rendered page, not blanks
