# Sprint 02 — Nav + Hero
**Status:** proposed
**Figma source:** file `908TLdOM0e6xRtnzOj2nNv`, node `39:2`
**Breakpoints:** 390 / 768 / 1024 / 1440

---

## Inputs
| File | Sections to load |
|------|-----------------|
| `WORKSPACE.md` | All |
| `_config/design-system/token-map.md` | All |
| `studio-memory.md` | §2 Design Principles, §3 Quality Criteria, Anti-defaults |
| `learnings/hostinger-relative-asset-paths.md` | All |

---

## POV
This is a Colorado Americana artist site. The hero is not a SaaS landing page. It should feel like a worn concert poster — warm, tactile, a little rough around the edges. The nav pill floats on top of the photo, not above it. The guitar pick decoration is part of the character, not decoration to skip. No centered hero + subline + CTA pattern. The photo bleeds, the type is grounded, the pick is tilted.

---

## Contract
*(To be filled by Generator after approval)*

---

## Design specs

### Tokens--color-bg: #241420;

--color-nav-bg: #f6849a;

--color-nav-text: #4f2c3d;

--color-nav-text-active-underline: #fffcdb;

--color-body: #e5dcd3;

--color-muted-gold: #caa45f;

--color-rose: #f6849a;

--color-rose-muted: #d6abb3;

### Fonts
- **Lora** — display, body (Google Fonts)
- **Open Sans** — nav, UI labels (Google Fonts)
- **Praise** — drop cap only (Google Fonts, load only on pages that use it)

### Nav (node 39:97)
- Floating pill, `background: #f6849a`, `border-radius: 999px`, `padding: 16px 24px`
- Positioned: `top: 18px`, right-aligned at 1440 (`left: 1000px` in Figma = right-side float)
- Links: Home / Shows / Media / Booking / Shop — Open Sans SemiBold 16px, color `#4f2c3d`
- Active state (Home): bottom border `2px solid #fffcdb`
- Mobile: full-width pill or hamburger — Generator decides and logs to decisions.md

### Hero (nodes 39:3, 39:4–39:11)
- Full-bleed background photo (`IMG_3132`) — `object-fit: cover`, `object-position: top center`
- Guitar pick SVG decoration: `width: 272px`, `rotate: -96deg`, positioned top-left bleeding off canvas
- Small portrait/logo lockup rotated `-6deg` over the pick (node 39:9) — Gemini-generated image
- Hero height: viewport height on desktop, `min-height: 100svh` on mobile
- No headline text in the hero — the photo and nav are the hero
- Image assets: use Cloudinary or self-host; do NOT use expiring Figma MCP asset URLs in production code. Placeholder `<img>` with TODO comment acceptable for Sprint 2 if assets aren't in Cloudinary yet.

---

## Implementation notes
- Next.js App Router, CSS Modules, no Tailwind
- All color/spacing values from token-map.md — no raw hex in component code
- Asset paths must work at root (`/`) and at `/_previews/[N]/` — relative paths only
- Guitar pick is an SVG decoration — inline SVG or `<img>` with explicit width/height, not a background-image
- Nav active state is static for Sprint 2 (Home always active) — dynamic routing in a later sprint

---

## Audit checklist
- [ ] Nav renders at all 4 breakpoints without overflow
- [ ] Hero photo covers full viewport height at 390 and 1440
- [ ] Guitar pick visible and correctly rotated at 1440
- [ ] No raw hex values in CSS (all tokens)
- [ ] No absolute asset paths (all relative or env-var-driven)
- [ ] No Figma MCP expiring URLs in production code
- [ ] Reduced-motion: no animation issues
- [ ] Keyboard: nav links focusable, focus ring visible
- [ ] `npm run build` passes locally before PR opens#  <#Title#>

