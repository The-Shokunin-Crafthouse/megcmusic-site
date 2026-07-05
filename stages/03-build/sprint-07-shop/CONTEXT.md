# Sprint 07 — Shop (WooCommerce storefront + Zustand cart)
**Status:** in build — slices 1–3 (listing + detail + Zustand cart) built & verified 2026-07-05 (PR: browse + cart). Checkout (slice 4) wired as the same-origin hand-off per the 2026-07-05 ADR; end-to-end carryover needs same-origin staging/prod verification (nonce not readable cross-origin on the preview).
**Figma source:** file `908TLdOM0e6xRtnzOj2nNv` (Shop frames — pull node IDs via `get_metadata`; the Figma MCP needs auth and may be unreachable in a non-interactive session — build from the established route register if so, and say so).
**Breakpoints:** 390 / 768 / 1024 / 1440 / 1920

---

## POV
Her merch feels like the rest of the site — warm, dark, unmistakably hers. A promoter or fan browses records and merch on the same plum ground, adds to a cart that follows them, and checks out through the PayPal gateway she already runs. Meg manages the whole catalogue in WooCommerce and never touches code or keys.

## FIRST decision — checkout path (decide + log an ADR before wiring payment)
The store is WooCommerce on megcmusic.com with **PayPal as the existing gateway**. Decide the headless checkout equivalent and log an ADR **before** building the payment step — don't guess it (same discipline as the Phase-3 booking ADR). Weigh at least:
- **Headless browse/cart (wc/v3 read) + hand off to her existing Woo/PayPal checkout URL** for payment — lowest risk, gateway untouched, cart state rebuilt on the Woo side; vs.
- **WooCommerce Store API** (`/wp-json/wc/store`) for a fully headless cart + checkout — richer UX, more surface + payment wiring to own.
Constraint: the WP host **blocks datacenter IPs** (2026-07-03 ADR), so every server-side `wc` call needs the bounded-fetch (12s abort) + residential-IP browser fallback (mirror `wordpress.ts`/`events.ts` + their `*-browser.ts`). Meg never touches code/keys.

## Slices (own PR each, sign-off between — this is the biggest surface)
1. **/shop listing** — products from `wc/v3` (grid, price, availability; categories/filter only if the catalogue warrants it). Lazy images, no CLS. Route shell mirrors /shows·/epk·/media·/booking.
2. **/shop/[slug] detail** — gallery, variations, description, add-to-cart.
3. **Cart** — Zustand store (per the brief), cart drawer/sheet, line-item qty edit + remove, subtotal, persists across navigation.
4. **Checkout** — per the ADR decision above. Real states on every fetch + cart action.

If the session is threatened, ship 1–3 and tell Levi before rushing checkout to Gate 3.

## Inputs table (load only these + the token-map + files you touch)
| # | File | Why |
| --- | --- | --- |
| 1 | `WORKSPACE.md` | Project identity, non-negotiables, operating rules |
| 2 | `../studio-memory/WORKFLOW.md` | Stage sequence + gates (canonical, referenced) |
| 3 | `stages/03-build/sprint-06-homepage/CC-PROMPT.md` §6/§2/§7/§8 | Phase-4 scope, design rules, verification, known facts |
| 4 | `_config/design-system/token-map.css` | The only legal home for raw values |
| 5 | `decisions/decisions.md` | Prior ADRs (Phases 1–3, booking, IP-block, teal/glass refresh) |
| 6 | `LEARNINGS.md` | Repo learnings (Turbopack @import, ISR abort, IP block, top-clearance) |
| 7 | `src/lib/api/woocommerce.ts` | Existing `wc/v3` client — extend, don't fork |
| 8 | `src/lib/api/wordpress-browser.ts` · `events-browser.ts` | Residential-IP browser-fallback pattern to mirror for the datacenter block |
| 9 | `src/components/SiteChrome/*` · `SectionLabel/*` · one route (`app/shows` or `app/epk`) | The shared register + route-shell pattern to reuse |

## Hard rules (unchanged)
- Tokens only from `_config/design-system/token-map.css` — no raw hex/px/ms in components. Extend the map + log an ADR for any new value (Sprint-2/3 + Phase-3 token-additions pattern). Reveal tokens `--mc-reveal-duration`/`-stagger` exist for route-header entrances.
- Reuse the register: fixed hero photo + plum scrim route shell, glass pills, teal accent, ★★★ SectionLabel, shared SiteChrome, cinematic hovers (brighten-never-darken), card/section rhythm, `--mc-focus-ring`/teal focus rings.
- Every interactive element: 5 states + visible focus + reduced-motion path. AA contrast. 8pt spacing. 44px touch. Phosphor per-icon SSR imports only. Load `emil-design-eng` before any motion code.
- ISR only (static export is out). Products ISR 24h per the brief. No `new Date` on WP timestamps (use `datetime.ts`).
- Verify each slice (sc-verify / Gate 3), push the branch, let CI post the `meggy-cb-ahn` preview URL — **never** local `vercel deploy` (repo learning). One PR per slice; Levi merges.

## Out of scope
- Anything outside the shop (Phases 1–3 are merged and live — don't touch the booking/Gmail path, the homepage scene, or the native routes).
- New payment gateways — reuse her existing PayPal/Woo gateway per the ADR.

## Audit checklist (per slice, before presenting)
- [ ] Products render from `wc/v3`; server fetch bounded + residential-IP browser fallback (no empty shop on the datacenter block)
- [ ] Listing grid: lazy images, reserved space, no CLS; five states incl. empty/loading/error
- [ ] Detail: variations + add-to-cart wired; gallery accessible (keyboard, alt)
- [ ] Cart (Zustand): add/qty/remove/subtotal; persists across navigation; drawer keyboard + focus-trap + reduced-motion
- [ ] Checkout path matches the logged ADR; real states; no secrets in client
- [ ] Tokens only (any new value added + logged); grep clean for raw `#`/`px`/`ms` in `src/**/*.module.css`
- [ ] Responsive 390/768/1024/1440/1920; AA contrast; keyboard path end-to-end
- [ ] `npm run build` exits 0
- [ ] Update WORKSPACE.md `Current sprint:` pointer to this sprint at kickoff
