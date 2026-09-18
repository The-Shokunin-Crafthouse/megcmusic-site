# SPRINT 18 — Absorb the last old-theme pages; footer on every page (CONTRACT)

> Filed 2026-09-17 from Levi's list after Sprint 17 merged: (3) absorb the Photos and review pages into the site with the new theme and report their live URLs and WordPress page names; (4) add the footer to all pages; (5) delete the full-page proof PNGs; (6) promote the two learnings to studio-memory. Filed beside Sprint 14. Branch `feat/absorb-old-theme-pages`.
>
> **Inputs table:** `WORKSPACE.md` · `decisions/decisions.md` (2026-09-17 absorb ADR) · Sprint 16 audit §1 (the three pages) · `scripts/fetch-releases.mjs` · `src/lib/press-page.ts` (+ test) · `src/app/music/[slug]/reviews/` · `src/app/layout.tsx` · plugin 1.5.1 · guide §02.
>
> **Status (2026-09-17):** (5) done in this branch (PNGs removed, preview URL cited in Sprint 17 `output/proof.md`) · (6) done — studio-memory learnings 255–256, PRs #370/#371 merged · (3)+(4) ✅ #151 merged, deployed 2026-09-18 03:58 UTC, plugin 1.5.1 uploaded by Levi; verified live in a browser (both reviews routes, links, quote, images; EPK repoint; footer on every route). **Sprint 18 complete.**

**Prime directive:** no visitor path from megcmusic.com leads to the old Storefront theme except WooCommerce checkout and Event Tickets. Meg adds a review page by linking it from a release's review rows; nothing else.

## Live homes of the absorbed pages

| WordPress page | id | Live URL |
|---|---|---|
| Photos | 5520 | `https://megcmusic.com/media#media-photos` |
| Reviews: Shadows of a Ghost Town | 5134 | `https://megcmusic.com/music/shadows-of-a-ghost-town/reviews` |
| Kindred Spirits Review | 5339 | `https://megcmusic.com/music/kindred-spirits/reviews` |

## Invariants
- Parity on every existing route except the two intended changes: the footer on every non-Home route, the EPK "Hi-res photos" target. Text diff against production reads only those plus live data.
- The two new routes render every paragraph, link, quote and image of their WordPress pages; links open in a new tab and say so; nothing is raw HTML.
- Plugin 1.5.1: route map + rebuild list; PHP test green in CI; one re-upload.

## Proof
`output/proof.md`, filled at close.
