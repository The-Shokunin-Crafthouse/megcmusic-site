# Phase 1.1 — Visitor walk of the live shop

**Runner:** session · **Date:** 2026-09-14 · **Target:** `https://megcmusic.com` (production, not a preview)
**Status: INCOMPLETE — interrupted.** The interactive walk stopped partway (see §4). Everything in §1–§3 was observed directly; nothing here is inferred.

## 1. What was verified

Viewport 1440×900, real browser, production origin.

| Step | Result |
|---|---|
| `/shop` renders | 14 products hydrate client-side, names + prices correct, sale strikethrough present (Dog Bandana `$10.00` → `$5.00`) |
| Product detail `/shop/cowgirl-boot-koozie` | Renders h1 "Cowgirl Boot Koozie", `$6.00`, `IN STOCK`, quantity stepper, enabled **Add to cart** |
| Add to cart | Drawer opens on click. `Your cart · 1` · line item "Cowgirl Boot Koozie" `$6.00` · qty `1` · **Remove** · `Subtotal $6.00` · "Shipping and taxes are calculated at checkout." · **Checkout** |

No money moved. No order placed. One WooCommerce session cart exists as a result of the add.

## 2. Finding — every product page is nameless to a crawler

Observed on the product page, then confirmed server-side with `curl` on three shop routes.

```
/shop                          <title>Shop — MegCMusic</title>
/shop/cowgirl-boot-koozie      <title>Shop — MegCMusic</title>
/shop/shadows-of-a-ghost-town-cd   <title>Shop — MegCMusic</title>
```

For `/shop/cowgirl-boot-koozie` the served HTML also carries:

- `<meta name="description" content="Colorado-based singer-songwriter — shows, music, merch, and press.">` — the site-wide root fallback, not the product's
- zero `og:` tags
- the string `Cowgirl Boot Koozie` **0 times** in the server response

So all 14 product pages are identical and nameless in a browser tab, a search result, and any shared link preview.

**Cause, not guessed — read.** `src/app/shop/[slug]/page.tsx` `generateMetadata` is written correctly: it returns `` `${product.name} — MegCMusic` `` plus a description derived from the short description. It falls back to `{ title: "Shop — MegCMusic" }` only when `loadProduct` returns `product: null`, which happens when the `wc/v3` read throws. `/shop/[slug]` is a **dynamic** route, so that read runs at request time on Vercel — and the Vercel runtime cannot reach WordPress (studio note; only the GHA build runner can). Every request therefore takes the null branch. The page body recovers by fetching in the browser; metadata cannot, because it is emitted before the browser runs.

This is the "read WP at build, never per request on a dynamic route" rule failing in production, on a route that has been live since Sprint 7.

**Scope note.** The sprint contract (§5) writes query hygiene out of scope with the reason "every WordPress read happens at build on the GHA runner", and adds: *"If Phase 2.1 finds a runtime WP read on a hot path, that finding reopens this line."* This is that finding, arriving in Phase 1 instead of Phase 2. The line is reopened.

**Not fixed here.** The fix is a route-shape change (prerender the 14 product pages at build with ISR, the way `/shop` already gets its data), which is a sprint decision, not a walk finding. Filed for Levi.

## 3. Standing Gate-4 lines this walk does and does not touch

- Blocker 3 (DNS cutover) — **resolved**, evidence in the contract §0.
- Blocker 4 (one real cart → Woo → PayPal order, number logged) — **still open**, and it is Levi's to run (2026-07-05 ADR). Unchanged by this walk.

## 4. What is left of this walk

Interrupted before these; none were observed, so none are recorded either way:

- [ ] Second product added — two distinct lines in the drawer, subtotal correct
- [ ] **The Checkout click** — the crux. Expected per the 2026-08-29 ADR: the front end is on the apex, `WP_ORIGIN` is `admin.megcmusic.com`, so the credentialed Store API GET fails cross-origin and `handoffToCheckout` throws `CheckoutOriginError`, which the drawer renders as the honest "Continue on the store" notice pointing at `admin.megcmusic.com/cart/`. **Expected is not observed** — this line stays unchecked until someone watches it happen.
- [ ] The same walk at 390
- [ ] Screenshots at 1440 and 390
