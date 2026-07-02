# Sprint 03 — Shows / Dates
**Status:** approved
**Figma source:** file `908TLdOM0e6xRtnzOj2nNv`, node `39:12` (Dates/Mask group)
**Breakpoints:** 390 / 768 / 1024 / 1440

---

## Inputs
| File | Sections to load |
|------|-----------------|
| `WORKSPACE.md` | All |
| `_config/design-system/token-map.md` | All |
| `studio-memory.md` | §2 Design Principles, §3 Quality Criteria, Anti-defaults |
| `learnings/hostinger-relative-asset-paths.md` | All |
| `src/lib/api/events.ts` | All |

---

## POV
Show cards should feel like physical tickets or set-list paper — warm cream on deep plum, date badge with the guitar pick vector behind it. The tabs (Up Next / Just Added / Past Shows) are the primary navigation for this section. Live data from the Events API; graceful empty state when no upcoming shows. Not a generic event listing — this is a touring musician's front porch.

---

## Contract

**Approved:** 2026-06-16 (Levi Bahn). Scope = the **Shows section**, mounted on the home page (`/`) below the hero, server-fetched with client-side tab switching. The home page is assembled section-by-section (Sprint 2 = nav + hero); `preview.ts` screenshots `/`, so the section must live there, not a separate route.

### Build
- **`ShowsSection`** (`'use client'`) — APG tablist (Up Next default · Just Added · Past Shows): roving tabindex, ←/→ arrows, `aria-selected` / `aria-controls`; renders the active list + per-tab empty state. Visually-hidden `<h2>Shows</h2>` landmark.
- **`ShowCard`** — cream card on plum: date badge (month + day) over an inline `aria-hidden` guitar-pick SVG (`rotate(-96deg)`), show title, time range, venue, city, 1px dividers. **Whole card is a stretched primary link → the event's existing WP page (`event.url`).** **Venue → Google Maps directions link**, raised above the stretched link (no nested `<a>`).
- **`src/lib/datetime.ts`** — epoch-safe month / day / time-range formatters parsed by regex off `start_date` (no `new Date(bare)`; learning #48).
- **`page.tsx`** (server) — `getEvents('upcoming')` + `getEvents('past')` in try/catch → `[]`; pass to `ShowsSection`. Build never breaks on an API hiccup.
- **`token-map.css`** — add `--mc-radius-card:8px`, `--mc-shadow-card:0 8px 18px rgba(0,0,0,.55)`, `--mc-divider-card:#b2aba4`, and type ramp `--mc-text-2xs/-base/-lg/-2xl` (12/16/22/32px). Logged via sc-adr (mirrors the Sprint-2 token-additions ADR).

### Behaviour
- **Tabs:** 3 kept (faithful to Figma 39:15). "Just Added" = upcoming sorted newest-first by publish date when the live payload carries one (additive optional field on `TribeEvent`), else graceful fallback to Up Next order. Logged.
- **List cap:** up to **7** real events per tab — no fake padding (lorem is a non-negotiable bug).
- **Entrance:** rows animate **translateY up + scale .8 → 1**, staggered (CSS keyframes, per-row delay), replays on tab switch; `prefers-reduced-motion` → instant. Tabs + cards carry hover/press micro-motion (motion-alive non-negotiable).
- **"See all shows"** button centered under the rows → her current WP shows listing (URL verified at build).
- **Mask (39:12):** `overflow:hidden` container, not `mask-image` (per Design specs).
- **Responsive:** mobile-first; cards 100% width, capped `max-width:700px` centered; verified 390 / 768 / 1024 / 1440.
- **Tokens only:** every colour / radius / shadow / size via `var(--mc-*)`; asset paths relative; no raw hex in component code.

### Deferred to their own sprints (logged in decisions.md)
- **Hero scroll-pin + page-scroll-release** (req #5 / #7) — re-opens the Sprint-2 static hero; belongs in a dedicated homepage scroll-composition sprint with a Gate-2 motion spec.
- **Native event detail page** (req #3) — new surface; Sprint-3 interim = card → existing WP event page.
- **`/shows` full listing** — the See-all destination; Sprint-3 interim = her current WP shows page.

### Known risk
Venue red `#d13e5b` on cream `#f7eadd` at 16px regular may fail AA (~4:1). Measured at audit; if it fails → add a darker `-ink` token (learning #56), never a sub-AA ship.

---

## Design specs

### Show card (node 39:22)
- Background: #f7eadd, border-radius: 8px
- Drop shadow: 0px 8px 18px rgba(0,0,0,0.55)
- Padding: 19px 32px 19px 16px
- Date badge: Lora Bold 12px month (#e5dcd3) + Lora Regular 32px day (#e5dcd3), guitar pick vector behind it (rotate -96deg)
- Show title: Lora SemiBold 22px, color #4f2c3d, links to event URL
- Time: Open Sans Regular 16px, #4f2c3d
- Venue: Open Sans Regular 16px, #d13e5b
- City: Open Sans Regular 16px, #4f2c3d
- Dividers between time/venue/city: 1px #b2aba4, height 19px

### Tabs (node 39:15)
- Active tab: background #f6849a, text #4f2c3d, Open Sans SemiBold 16px
- Inactive tab: background #d6abb3, text #4f2c3d, Open Sans Regular 16px
- border-radius: 999px, padding: 8px 16px

### Section container
- Card width: 700px at 1440 — responsive on smaller breakpoints
- Gap between cards: 16px
- Mask/clip effect from Figma (node 39:12): implement as overflow-hidden container, not CSS mask-image

### Data
- Live from `getEvents('upcoming')` — ISR revalidate 3600
- Tab switching: client component with useState (Up Next default)
- Past shows: `getEvents('past')`
- Just Added: no dedicated API filter — show most recently added upcoming events (sort by created date if available, else omit tab or show same as Up Next with a note in decisions.md)
- Empty state: "No upcoming shows right now — check back soon." in Lora Italic, centered, #e5dcd3

---

## Implementation notes
- Next.js App Router, CSS Modules, no Tailwind
- Server component fetches upcoming + past data, passes to ShowsSection client component
- All color/spacing values from token-map.md — no raw hex in component code
- Asset paths relative only
- Guitar pick behind date badge: inline SVG preferred

---

## Audit checklist
- [ ] 3 tabs (Up Next / Just Added / Past Shows) switch without page reload
- [ ] "Just Added" sorts newest-first, or falls back to Up Next order when no publish date
- [ ] Show cards render with live Events API data at build time
- [ ] Empty state renders correctly when no events returned (per-tab copy, Lora italic, centered)
- [ ] Date badge visible with guitar pick vector at 1440
- [ ] Cards stack full-width at 390
- [ ] Whole card click → existing WP event page; venue → Google Maps directions
- [ ] Rows animate up + scale .8→1, staggered, on load and on tab switch
- [ ] Max 7 rows; no fake padding
- [ ] "See all shows" button centered under rows → current WP shows page
- [ ] No raw hex in CSS
- [ ] No absolute asset paths
- [ ] Keyboard: tabs (APG roving tabindex + ←/→), show links, venue link, See-all all focusable; 5 states
- [ ] Reduced-motion delivers a functional path (instant, no transform)
- [ ] Venue-red contrast measured — AA pass or darker `-ink` fix
- [ ] npm run build passes locally before PR opens
