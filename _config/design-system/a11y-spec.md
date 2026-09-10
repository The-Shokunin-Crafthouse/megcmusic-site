# Accessibility spec — megcmusic-site

Written at Gate 2 per `sc-a11y-spec`. One table per component; `sc-verify`'s screen-reader line is checked against this file. No Figma comp exists for the Home blocks — they derive from built components (audit, Sprint 12 Phase C), so each row's name source is the built markup.

## HomeBlocks zone (Sprint 13)

| Element | Accessible name | Name source | Role | States announced | Focus order | Live region | Reduced motion | WCAG |
|---|---|---|---|---|---|---|---|---|
| Zone `<section aria-labelledby="home-blocks-heading">` | "What's New" | `aria-labelledby` → the `SectionLabel` h2 (stars are `aria-hidden`) | region (landmark, named) | none — static | After the Instagram section, before the press-kit teaser; no focusable of its own | none | n/a — the zone has no motion | 1.3.1, 2.4.6 |
| `SectionLabel` h2 | "What's New" | visible text | heading level 2 | none | not focusable | none | n/a | 1.3.1 |

Empty zone: the section is not rendered at all (no landmark, no heading). Nothing to announce, nothing in the tab order.

## Announcement block (Sprint 13 Phase 1)

| Element | Accessible name | Name source | Role | States announced | Focus order | Live region | Reduced motion | WCAG |
|---|---|---|---|---|---|---|---|---|
| Block `<article>` | the headline | `aria-labelledby` → the block's h3 | article | none | contains at most one focusable (the link) | none | n/a | 1.3.1 |
| Eyebrow `<p>` | — | visible text, read as a paragraph before the heading | paragraph | none | not focusable | none | n/a | 1.3.1 |
| Headline `<h3>` | the headline text | visible text | heading level 3 (under the zone's h2) | none | not focusable | none | n/a | 1.3.1, 2.4.6 |
| Body `<p>` | — | visible text | paragraph | none | not focusable | none | n/a | — |
| Link `<a href>` | "{link text}" for same-site links; "{link text}, opens in a new tab" for external links | visible text + visually-hidden suffix (`.srOnly`, inside the anchor — no scroll ancestor, so #110 does not apply) | link (native) | default · hover (colour brightens, 3 px nudge) · focus (2 px teal ring, 3 px offset — `--mc-teal-light` on `--mc-bg`, 5.9:1) · active (nudge held) · disabled: **not applicable** — a block with no address renders no link at all (parser rule), so `aria-disabled` never arises (#3) | One stop per announcement, in Meg's block order, between the Instagram link(s) and the EPK teaser's controls | none | `transition: none`; the ring and colour change remain | 2.4.4, 2.4.7, 2.5.8 (44 px min height via `--mc-touch-target`), 1.4.11 |

Findings: none blocking. Not determinable without a build: the tab-order position relative to the Instagram section's own links (verified in Phase 1's `states.mjs` walk).

## Pull-quote block (Sprint 13 Phase 2)

| Element | Accessible name | Name source | Role | States announced | Focus order | Live region | Reduced motion | WCAG |
|---|---|---|---|---|---|---|---|---|
| `<blockquote>` (shared `PullQuote`, the LinerNotes panel) | — | none; read as a blockquote, its text the quote in the panel's own curly marks | blockquote (native) | none — static, nothing interactive | not focusable; adds no tab stop | none | n/a — no motion | 1.3.1 |
| `<cite>` attribution | — | visible text, rendered only when Meg gives one | cite (native) | none | not focusable | none | n/a | 1.3.1 |

Empty quote: the parser drops the row, nothing renders. Same markup as the LinerNotes pull-quote, so a screen reader meets one pattern for both.
