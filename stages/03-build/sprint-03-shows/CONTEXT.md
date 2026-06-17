# Sprint 03 — Shows / Dates
**Status:** proposed
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
*(To be filled by Generator after approval)*

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
- [ ] Tabs switch between Up Next / Past Shows without page reload
- [ ] Show cards render with live Events API data at build time
- [ ] Empty state renders correctly when no events returned
- [ ] Date badge visible with guitar pick vector at 1440
- [ ] Cards stack full-width at 390
- [ ] No raw hex in CSS
- [ ] No absolute asset paths
- [ ] Keyboard: tabs and show links focusable
- [ ] npm run build passes locally before PR opens
