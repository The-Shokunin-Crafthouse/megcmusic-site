# Sprint 06 — Homepage finish (all sections) + remaining routes
**Status:** in build (kickoff 2026-07-04, Levi Bahn — `CC-PROMPT.md`)
**Figma source:** Desktop `39:2` · Mobile `110:2` · Mobile menu `112:191` (file `908TLdOM0e6xRtnzOj2nNv`)
**Breakpoints:** 390 / 768 / 1024 / 1440 / 1920

---

## POV
The home page finally moves the way her music does: Meg's photo fills the screen, the mark and nav arrive with weight, and the tour dates ride over the photo before the page settles into the warm plum story below — bio, socials, press kit, videos, newsletter, discography — every section alive, every value tokenised.

## Phases (one PR each, sign-off between)
1. **Scroll architecture** — the pinned hero scene: entrance choreography, desktop/mobile pin + release, z-scale, scrim + motion tokens. *(this PR)*
2. **Homepage sections** — Liner Notes, Instagram (Behold), EPK, Videos, Newsletter (new design), Discography, Footer + the boot scroll piece (§5).
3. **EPK page · Media · Booking** — native routes over WP pages.
4. **Shop** — WooCommerce storefront (own sprint folder + PR).

## Confirmed from the comp (39:2)
- Section order: Hero → Liner Notes → Instagram → EPK → Videos → **Newsletter (new, no comp)** → Discography → Footer.
- Hero = photo (39:3) + flat plum scrim `rgba(36,20,32,0.6)` (128:308) + big rotated corner logo (39:4, ~273px, −6°) + glass nav pill (39:97) + masked dates list (39:14).
- Recognition copy (§4.3) and Discography releases (§4.8) are in the comp — no invented content needed. Per-release streaming deep links still TBD (artist-level links in §4.8).

## Phase 1 contract (this PR)
- `HomeScene` client orchestrator: fixed photo+scrim backdrop; ShowsSection as pinned hero content with a **"See all dates"** button → `/shows`.
- Entrance timeline: scrim fade → logo → nav → dates, each scaling up from 0.94 + slide + fade, back-out overshoot. All values tokenised (`--mc-entrance-*`, `--mc-scrim-*`).
- Desktop: photo + logo + nav fixed through the dates scroll; release (all but the logo) when "See all dates" hits 48px above the viewport bottom. Logo fixed + top z-index on every route, forever.
- Mobile: logo + nav scroll away on first scroll; only the photo stays fixed; it locks when "See all dates" is 48px above the footer (Phase 1: end-of-scene marker; Phase 2 repoints at the footer). Logo NOT persistently fixed (explicit exception).
- Reduced motion: entrance elements present statically; pin/release still lays out (unpin entirely if it risks motion sickness).

## Out of scope (Phase 1)
- Section content (Phase 2), boot art (§5), EPK/Media/Booking (Phase 3), Shop (Phase 4).
- Big-rotated hero-logo restyle to match 39:4 exactly — logged as a Phase-2 hero item; Phase 1 keeps the existing logo footprint.

## Audit checklist (Phase 1)
- [ ] Hero photo is LCP, painted at first paint (no animation gating the image)
- [ ] Entrance: logo → nav → dates staggered scale-in; reduced-motion presents statically
- [ ] Desktop pin: photo/logo/nav fixed through the dates list; release at 48px above viewport bottom
- [ ] Mobile: logo+nav scroll away first; photo fixed then locks at the end-of-scene marker
- [ ] Logo fixed + top z on every route (desktop); absolute on mobile
- [ ] "See all dates" → /shows; five states; keyboard reachable through the pinned scene
- [ ] Tokens only (z-scale, scrim, entrance motion added + logged); grep clean for raw `#`/`px`/`ms`
- [ ] `npm run build` exits 0; snapshots at 390/768/1024/1440
