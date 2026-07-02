# Sprint 05 — /shows Archive Enhancements
**Status:** approved (2026-07-02, Levi Bahn — live directive after the Sprint-4 preview)
**Figma source:** none new; extends the Sprint-3/4 vocabulary.
**Breakpoints:** 390 / 768 / 1024 / 1440

---

## POV
The /shows destination earns parity with her current WordPress events archive: a fan can search for a show, page through the history, and drop any date onto their own calendar — all inside the warm plum, cream-ticket world, now over the same full-screen portrait as home.

## Contract (as directed)
Six changes to /shows and the global chrome:
1. **Search** — live client filter over title / venue / city, scoped to the active tab.
2. **Numbered pagination + page-size** — page-number controls with a 20 / 50 / 100 per-page dropdown (active tab). Overrides the studio "no page-number widget" anti-default by explicit request.
3. **Full-screen background** — the home hero photo, fixed behind the listing, under a top-weighted plum scrim for AA contrast.
4. **Add to calendar** — per show (Apple/Google/iCal/Outlook/Yahoo), via the installed `add-to-calendar-button`, gated to /shows so home is unchanged.
5. **Left-align header** — header copy aligns to the event-row column (was indented).
6. **Global logo** — her lockup as a persistent element on every page, links home; existing nav-pill design kept.

## Scope reversals (logged)
- Search and numbered pagination were out-of-scope / anti-default in Sprint 4 — see decisions.md (2026-07-02 entries). The full archive now loads at build (past included); the `/api/shows/past` proxy and "Show more" append are retired.

## Out of scope
- The venue HTML-entity decode (`&#8211;`) — shared ShowCard data fix, tracked separately.
- Native event detail page, hero scroll-pin — still their own sprints.

## Audit checklist
- [ ] Home unchanged (7-cap section, hero, nav via global chrome)
- [ ] /shows: search filters active tab live; empty-search state written
- [ ] Numbered pagination + 20/50/100 dropdown; appears only when a tab exceeds the page size; keyboard-operable, five states
- [ ] Add-to-calendar on every /shows card; correct local time; keyboard reachable
- [ ] Full-screen photo + scrim; header + cards keep AA
- [ ] Header left-aligned to the card column
- [ ] Logo global on every page, links home; nav active-underline route-aware
- [ ] Tokens only (new `--mc-bg-rgb` triplet logged); asset paths relative
- [ ] `npm run build` exits 0; snapshots at 390/768/1024/1440
