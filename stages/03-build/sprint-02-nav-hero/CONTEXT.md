# Sprint 02 — Nav + Hero
**Status:** approved
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
**Approved:** 2026-06-16

### Build
- `Nav` (`src/components/Nav/`) — floating pink pill, top-right at desktop. Links: Home / Shows / Media / Booking / Shop (semantic `<nav>` + `<a>`). "Home" active: Open Sans Bold + cream bottom-border underline + `aria-current="page"` (static this sprint; dynamic routing later). Five states: default, hover, focus-visible, active; disabled N/A for nav links (documented).
- `Hero` (`src/components/Hero/`) — full-bleed background photo, `100svh`, `object-fit: cover`, `object-position: top center`. Guitar-pick + name-lockup decoration bleeding off top-left.
- Mounted in `src/app/page.tsx` + `globals.css`. Fonts this sprint: Lora + Open Sans (600/700) only — Praise/Newsreader deferred (no drop cap in scope).
- Responsive, mobile-first: 390 / 768 / 1024 / 1440.

### Assets — all local, relative paths, no expiring Figma URLs, no Cloudinary
- Guitar pick (`39:6`) — vector downloaded as SVG, inlined, fill via token (tintable).
- Name lockup "Meghan Clarisse" (`39:9`) — **SVG**, downloaded to repo, relative `src`.
- Hero photo `IMG_3132` (`39:3`) — optimized raster in `public/images/hero/`, relative `src` via plain `<img>`/`<picture>` (not `next/image`, for `/_previews/[N]/` compatibility), source optimized for LCP < 2.5s.
- All assets resolve at `/` AND `/_previews/[N]/` (relative or assetPrefix-driven — learning #25).

### Token additions to `token-map.css` (logged via sc-adr)
- `--mc-nav-underline: #fffcdb`
- `--mc-radius-pill: 9999px`
- `--mc-motion-micro: 120ms` (+ ease-out) for hover/focus
- `--mc-focus-ring` sized for AA on the pink pill if the accent fails contrast (learning #32)

### Decisions logged (`decisions/decisions.md`)
- Mobile nav: full-width floating pill, no hamburger (5 short links fit; avoids AI-default hamburger, keeps poster character).
- Token source: `token-map.css` (the `.md` is an unfilled studio template).
- Guitar pick as inline tokenized SVG; name lockup as local SVG.
- Hero photo via relative `<img>`/`<picture>`, not `next/image`.

### Build infra
- Author `scripts/preview.ts` + `npm run preview <sprint>` → 4 PNGs at 390/768/1024/1440 (CDP device-metrics, learnings #28/#55; no heavy new dep), aligned to `preview-deploy.yml`.

### Out of scope (later sprints)
Dates/shows panel (`39:12`+), Body sections, Footer, dynamic nav routing, Praise/Newsreader fonts.

### Verification criteria
- [ ] Nav renders at 390/768/1024/1440 — no overflow; 5 links; Home Bold + cream underline.
- [ ] Nav links: default/hover/focus/active visible; keyboard-focusable, focus ring visible & AA.
- [ ] Hero photo covers full viewport height at 390 and 1440; pick visible, rotated ~-96°; lockup rotated ~-6°.
- [ ] No raw hex / magic numbers in component CSS — all `var()` tokens; spacing from scale.
- [ ] All 3 assets local, relative `src`, render at `/` and `/_previews/[N]/`; no expiring Figma URLs.
- [ ] Reduced-motion: functional path.
- [ ] `npm run build` exits 0; `npm run preview sprint-02-nav-hero` exits 0 → 4 PNGs showing rendered section.
- [ ] PR: summary + live preview URL + 4 embedded snapshots; `preview-deploy.yml` watched.

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

