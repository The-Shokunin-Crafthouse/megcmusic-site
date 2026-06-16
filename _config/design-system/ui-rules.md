# UI Rules

Directive rules for UI produced in this project. These are not preferences. They are the bar.

## Motion

- Springs for interactive affordances. `ease-out` entrances. `ease-in` exits. `linear` only for continuous motion (progress, marquee, infinite scroll).
- Durations: 120ms micro, 220ms standard, 450ms orchestrated. Anything over 600ms justifies itself in writing.
- Reduced-motion delivers a functional path, not a blank page.
- Nothing animates without cause. Nothing that should animate is static.

## Typography

- One modular scale, one declared ratio. No ad-hoc sizes.
- Every text run sets line-height, tracking, and measure. Defaults do not leak through.
- `font-display: swap` minimum. Self-hosted faces are subset. Variable fonts preferred.
- One family with full range beats two in conflict. If two must coexist: sharp hierarchy, no overlap.

## Color

- Every color is a semantic token. Raw hex in component code is a bug.
- Dark mode is fully implemented or formally deferred. Half-states prohibited.
- AA minimum on body copy. AAA on legal and disclosure text.
- Start monochromatic. Add accents late. Three colors is usually one too many.

## Spacing

- 8pt scale default; 4pt for dense surfaces. All spacing comes from tokens.
- Component-internal spacing and layout spacing use distinct tokens.

## Interaction

- Every interactive element ships five states: default, hover, focus, active, disabled.
- Focus is visible and styled. Browser-default outlines ship only by decision, never by omission.
- Hit slop extends beyond the visible target when density requires.
- Touch targets 44×44 on mobile.

## Responsive

- Verified at 390, 768, 1024, 1440, 1920 minimum.
- Mobile is a first-class breakpoint from the first sketch. Do not design desktop-first and "handle mobile later."
- Layouts are tested, not asserted.

## Density register

- Dense UIs read as capable. Sparse UIs read as premium. Pick deliberately.
- Do not default to sparse because it is easier to lay out.

## Detail

These are the work, not the polish. If any are missing, the work is not finished:
- Scrollbar styling
- Favicon at 16, 32, and Apple touch
- Empty states (every list, every search result)
- 404 and 500 pages
- Loading skeletons (shape, not spinner)
- Form validation copy
- Placeholder text
- Hover affordances on every interactive surface
- Selection styling
- Print styles where relevant

## Copy

- Production copy is written, never filler. No lorem ipsum reaches staging.
- Button labels, error strings, empty states, onboarding — design decisions, not afterthoughts.
- Voice lives in `_config/voice/`. Pull from there.

## Accessibility

- Designed in, not audited in.
- Keyboard path works end-to-end on every flow.
- Screen reader verified on launch-critical flows.
- Motion-sensitive users served by reduced-motion paths.
- Color is never the only carrier of meaning.

## Assets

- Images optimized: responsive sizes, modern formats (AVIF/WebP with fallbacks), correct aspect ratios.
- SVG for icons and logos. Never raster where vector is possible.
- Video: poster frame, captions, preload discipline.

## Composition

- Grid is a premise, not a prison. Break it rarely and with force.
- Alignment is invariant: text, icons, controls, borders — all on the grid.
- Optical adjustments (icon nudges, baseline shifts) override geometric alignment when eyes disagree with math.
