# Sprint 02 — Nav + Hero — build notes

Materialization of the approved contract (see this folder's `../CONTEXT.md`).
Shipped on `feat/sprint-02-nav-hero`.

## Shipped
- `src/components/Nav/` — floating pink pill, 5 links (Home/Shows/Media/Booking/Shop), Home active (Bold + cream underline + `aria-current`). Server Component, zero client JS; all five states CSS-only.
- `src/components/Hero/` — full-bleed photo (`100svh`, `object-fit: cover`), hand-authored guitar-pick SVG + exported name-lockup SVG bleeding off the top-left.
- `src/app/page.tsx` / `page.module.css` — mounts Nav + Hero (replaces the Sprint-1 scaffold probe page).
- `_config/design-system/token-map.css` — added `--mc-nav-underline`, `--mc-radius-pill`, `--mc-motion-micro`, `--mc-ease-out`, `--mc-focus-ring` (ADR 2026-06-16).
- `public/images/hero/` — `hero.jpg` (optimized), `name-lockup.svg` (vector logo). Pick is inline in the component.
- `scripts/preview.ts` + `npm run preview` — CDP breakpoint snapshot pipeline (learning #55).

## Deviations from the literal spec (with reason)
- **Photo `object-position`** — spec said `top center`; on the real portrait asset that showed only sky/blossoms (subject cropped out). Adjusted to `center 30%` (narrow/tall crops) and `center 62%` at ≥1024 (short/wide crops) so the artist stays framed at every breakpoint — matching Figma's actual desktop fold (`39:3`).
- **Guitar-pick color** — the pick is the dark-plum backing the pink name-lockup sits over (Figma `39:4`), not a pink shape; tinted `--mc-bg-quote`, not `--mc-accent-rose`.
- **Guitar pick is hand-authored**, not the Figma export — the frame export wrapped the path in Figma canvas/page rects; a hand-authored silhouette is clean and `currentColor`-tintable (ADR 2026-06-16).
- **Decoration geometry** (pick/lockup size, rotation, corner-bleed offsets) is expressed as explicit values, not tokens — it is artwork-intrinsic, not spacing/type. Every color stays tokenized.

## Motion — written reason for a static section
WORKSPACE §3 requires a written reason for any static section. The Sprint-2 hero is intentionally still: the POV is a worn concert poster — stillness is the character. Scene motion (GSAP scroll, Three.js atmosphere) is pending Gate 2 and lands in a later sprint. The only motion this sprint is the nav-link hover/focus micro-transition, which has a `prefers-reduced-motion` off-ramp.

## Perf baseline (informal — formal CWV at Gate-3 review)
- **Zero client JS** on the route — Nav + Hero are Server Components; `/` prerenders fully static.
- **LCP element**: `hero.jpg` (1500×2000, ~480 KB), `fetchPriority="high"`, `decoding="async"`.
- **CLS guard**: hero photo is absolutely positioned with intrinsic `width`/`height`; lockup carries intrinsic dims → no reflow. Expect CLS ≈ 0.
- Build: `npm run build` exits 0; `/` is `○ (Static)`.

## Known follow-ups (not Sprint-2 scope)
- `hero.jpg` is a single JPEG — a `<picture>` + WebP/AVIF responsive set and font self-hosting are deferred to the Gate-3 perf pass.
- Nav routes `/shows`, `/media`, `/booking`, `/shop` are not built yet — links 404 until their sprints; `prefetch` is off until then.
- Nav active state is static (Home) — dynamic `usePathname` active state arrives with routing.
- Hand-authored pick is not pixel-identical to the Noun Project source (acceptable for a decoration; swap if an exact silhouette is required).
- **Vercel preview env has `NEXT_PUBLIC_SITE_URL` set to an empty string**, which crashed the first preview build (`new URL("")`). `layout.tsx` now resolves it defensively (empty/malformed → production origin), but the var should be set per environment (studio learning #7) so OG/canonical URLs point at the right origin.

## Previews
`previews/sprint-02-nav-hero/{390,768,1024,1440}.png` — regenerate with `npm run preview sprint-02-nav-hero`.
