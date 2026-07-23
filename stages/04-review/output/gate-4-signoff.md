# Gate 4 Sign-off — megcmusic-site Sprint 07 (/shop, /shop/[slug])

**Date:** 2026-07-05
**Reviewer:** Claude Code (Evaluator pass — sc-verify)
**Scope:** `/shop` listing + `/shop/[slug]` detail + cart + checkout hand-off, per `stages/03-build/sprint-07-shop/CONTEXT.md`

## Overall: CONDITIONAL PASS — checkout is NOT launch-verified

Code, build, and in-app UX pass. The checkout hand-off itself cannot be certified launch-ready because the domain-split prerequisites it depends on (2026-07-05 ADR, "Launch domain architecture") are only partially complete. See "Blocking for launch" below — this is a **launch blocker**, not a code defect.

## sc-verify results

Design quality
- **Motion:** PASS — hover lifts, focus outlines, spinner all reuse tokens (`--mc-motion-hover`, `--mc-ease-out-strong`, `--mc-spinner-spin*`); reduced-motion path present (spinner slows, not present live-tested via OS toggle — see Not verifiable).
- **Typography:** PASS — Lora/Open Sans ramp held; existing `--mc-text-*` tokens used throughout shop components.
- **Color:** PASS — no raw hex found in `src/app/shop/**` or `src/components/Shop/**`; all colors via `var(--mc-*)`. Product-name ink `rgb(79,44,61)` = existing `--mc-text-card`, previously AA-verified on cream.
- **Spacing:** CAVEAT — raw `px`/`rem` literals present (CartDrawer `420px` panel width, `64px` thumb grid; AddToCart `12rem` min-width; CartTrigger `3.5rem`/`1.375rem`/`-4px` badge offset; spinner icons `28px`; assorted `-2px`/`-3px` hover-lift transforms and `2px`/`3px` focus-outline offsets). None are new colors — they follow the same precedented pattern as prior ADRs (Instastar decor, logo nudge) that treat positional/motion-amplitude px as intrinsic-to-asset, not tokenizable spacing. Not a new violation introduced this sprint, but the CONTEXT.md checklist item ("grep clean for raw #/px/ms") is not literally clean — flagging rather than silently passing.
- **Interaction:** PASS — verified live: add-to-cart, qty stepper, remove, cart-open/close, checkout-click all functional with visible teal/nav-underline focus rings.
- **Responsive:** PASS — 390 and 1440 verified live, zero horizontal overflow (documentElement.scrollWidth == clientWidth at both). 768/1024/1920 not individually screenshotted this pass but grid uses the same media-query pattern as the rest of the site (verified elsewhere).
- **AI slop/anti-defaults:** PASS — no new violations; the site's already-logged glass/teal overrides stand.

Gate 3
- **Core Web Vitals:** Not verifiable — no Lighthouse run in this session (dev server, not throttled/prod build served).
- **Keyboard:** PASS — tab order logical (logo → nav → shop link → product cards → cart trigger), verified via `document.activeElement` walk.
- **Screen reader:** PASS (structural) — `preview_snapshot` shows correct roles/names (region "Products", article per product, heading hierarchy, button labels "Open cart", "Add to cart", "Decrease/Increase quantity"). No live screen-reader (VoiceOver/NVDA) run.
- **Contrast:** PASS — spot-checked product-name ink, matches previously-verified AA token.
- **Reduced motion:** Not verifiable — no OS-level reduced-motion toggle exercised this pass; code path exists (`--mc-spinner-spin-reduced` token, prefers-reduced-motion queries present elsewhere in shop CSS).
- **Cross-browser:** Not verifiable — Chrome only (preview tooling); no Firefox/Safari/iOS Safari pass performed.

## Functional verification (live, this session)
- `npm run build` — exit 0, all shop routes compile (`/shop` ISR 1d, `/shop/[slug]` dynamic).
- `/shop` renders 14 live WooCommerce products (prices, sale-price strikethrough, stock).
- `/shop/[slug]` renders gallery, price, stock, quantity stepper, add-to-cart, description.
- Add-to-cart → drawer auto-opens, line item + qty + subtotal correct, remove control present.
- **Checkout click → correctly shows the F-02 honest cross-origin notice** ("Continue on megcmusic.com" + live PayPal note) rather than a fake retry error — confirms the 2026-07-05 blocker fix is live and working as designed. This is the *expected* dev/preview behavior (front-end origin ≠ WP origin); it is not evidence checkout works same-origin in production.

## Sprint-07 CONTEXT.md audit checklist — status
- [x] Products render from `wc/v3`, no empty shop — verified live
- [x] Listing grid: lazy images, no CLS observed at 390/1440 — verified
- [x] Detail: add-to-cart wired; gallery keyboard/alt present — verified
- [x] Cart (Zustand): add/qty/remove/subtotal — verified live
- [x] Checkout path matches logged ADR; real states; no secrets in client — verified (cross-origin notice correct, no key/secret in bundle per architecture)
- [~] Tokens only — no raw hex; raw px/ms present but precedented pattern (see Spacing caveat above), not a new violation
- [x] Responsive 390/1440 checked; 768/1024/1920 inherited pattern, not individually re-shot
- [x] Keyboard path — verified
- [x] `npm run build` exits 0 — verified

## Blocking for launch (not a Gate-4 code defect — a launch-readiness gap)
Per the 2026-07-05 "Launch domain architecture" ADR, checkout only works same-origin. Status confirmed directly with Levi (2026-07-05):
1. ✅ WP subdomain created on Bluehost (Share Document Root, pointed at the WP install)
2. ✅ `NEXT_PUBLIC_WP_ORIGIN` set in Vercel
3. ❌ **DNS not yet cut over to Vercel** — production domain is not yet serving the new site
4. ❌ **No live cart → WooCommerce → PayPal test order has been placed or logged**

**Until 3 and 4 are complete, checkout cannot be certified launch-ready.** Do not represent checkout as verified/passing in any launch document until a real order is placed on the live domain and its order number is logged in `decisions/decisions.md` per that ADR's "still owner-side" list.

## Recommendation
Do not proceed to Stage 05 launch-output production yet. The Gate-4 checklist and code quality clear; the launch domain cutover + live transaction do not. Re-run this Gate-4 check (or just re-verify items 3–4 above) once DNS is cut and one real order is placed, then produce the five Stage-05 outputs.
