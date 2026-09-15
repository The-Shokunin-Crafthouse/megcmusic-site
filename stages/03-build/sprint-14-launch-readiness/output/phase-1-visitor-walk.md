# Phase 1.1 — Visitor walk of the live shop

**Runner:** session · **Date:** 2026-09-14 · **Target:** `https://megcmusic.com` (production, not a preview)
**Status: COMPLETE.** Walked at 1440×900 and 390×844. Everything below was observed directly.

## 1. The headline

**A visitor cannot buy anything through the new shop today.** They can browse all 14 products, build a cart, and read an honest notice — and then the path dead-ends on an empty WordPress cart. Nothing here is broken code; every piece behaves as written. The end-to-end result is still that no money can change hands through the new front end.

## 2. The walk, step by step

| Step | Observed |
|---|---|
| `/shop` | 14 products hydrate client-side, names + prices correct, sale strikethrough present (Dog Bandana `$10.00` → `$5.00`) |
| `/shop/cowgirl-boot-koozie` | h1, `$6.00`, `IN STOCK`, quantity stepper, enabled **Add to cart** |
| Add to cart | Drawer opens. `Your cart · 1` · line · qty `1` · **Remove** · `Subtotal $6.00` |
| Navigate to a second product | Cart persists in `localStorage` under `mcc-cart` |
| Add `shadows-of-a-ghost-town-cd` | `Your cart · 2` · two distinct lines · `Subtotal $20.99` (= 6.00 + 14.99) |
| **Click Checkout** | No navigation. A `role="alert"` replaces the button: **"Checkout opens on Meghan's store, where PayPal is set up."** plus a link labelled **"Continue on megcmusic.com"** |
| Follow that link | Lands on `https://admin.megcmusic.com/cart/` — **"Your cart is currently empty. Return to shop"**, rendered in the old WordPress theme |
| 390×844 | Identical notice and identical href. Drawer is full-screen, `scrollWidth == clientWidth == 390`, no horizontal overflow |

## 3. What this confirms, and what it costs

The `CheckoutOriginError` branch in `src/lib/checkout.ts` fires exactly as the 2026-08-29 ADR predicts. The front end is on the apex, `WP_ORIGIN` is `admin.megcmusic.com`, the credentialed Store API GET cannot complete cross-origin, and the drawer shows the honest notice rather than a lying "try again". That much is correct and working.

The cost is only visible end-to-end: **because the Store API write never happens, the visitor's cart never reaches WooCommerce.** They arrive at an empty cart on a differently-themed site and must find and re-add all their items. The ADR calls cart carry-over a "post-launch enhancement ... not a launch blocker". Watched as a visitor, that framing does not survive: the shop is browsable but not buyable.

**Correction to the interrupted draft of this sheet:** it said "one WooCommerce session cart exists as a result of the add." That is wrong — the Store API write is never reached, so no Woo cart was created at any point in this walk. Nothing needs cleaning up on her store.

## 4. Two defects found

**4.1 — The continue link lies about where it goes.** Label: "Continue on megcmusic.com". Href: `https://admin.megcmusic.com/cart/`. The visitor is *already* on `megcmusic.com`, so the label reads as "stay here" while the link leaves for a subdomain. `checkout.ts` has a comment saying the fallback "always points at the WordPress host, not this site" — true of the href, not of the label the visitor reads. Copy fix; no logic change.

**4.2 — Every product page is nameless to a crawler.** Confirmed server-side with `curl` on three shop routes:

```
/shop                              <title>Shop — MegCMusic</title>
/shop/cowgirl-boot-koozie          <title>Shop — MegCMusic</title>
/shop/shadows-of-a-ghost-town-cd   <title>Shop — MegCMusic</title>
```

For `/shop/cowgirl-boot-koozie` the served HTML also carries the site-wide root description ("Colorado-based singer-songwriter — shows, music, merch, and press."), zero `og:` tags, and the string `Cowgirl Boot Koozie` **0 times**. All 14 product pages are identical and nameless in a browser tab, a search result, and every shared link preview.

**Cause, read not guessed.** `src/app/shop/[slug]/page.tsx:21` `generateMetadata` is written correctly — it returns `` `${product.name} — MegCMusic` `` and a real description. It falls back to `{ title: "Shop — MegCMusic" }` only when `loadProduct` returns null, which happens when the `wc/v3` read throws. `/shop/[slug]` is a **dynamic** route, so that read runs at request time on Vercel, where the runtime cannot reach WordPress (only the GHA build runner can). Every request takes the null branch. The body recovers with a browser fetch; metadata cannot, because it ships before the browser runs.

This reopens the line the contract (§5) wrote out of scope on a stated condition — *"If Phase 2.1 finds a runtime WP read on a hot path, that finding reopens this line."* Here it is, arriving in Phase 1.

## 5. What this means for Phase 1.2 (Levi's live order)

Phase 1.2 says "one real cart → Woo → PayPal order placed from `megcmusic.com`". **As the site stands, that cannot be done from `megcmusic.com`** — the cart does not survive the hand-off. An order placed after following the notice is placed on the WordPress store, which proves her PayPal gateway still takes money and proves nothing about the new front end, because there is no hand-off to test.

So Phase 1.2 needs a decision before it runs, not during it:

- **(a)** Place the order on the WP store as-is, log it as a *gateway* proof, and record the hand-off as unproven — honest, cheap, leaves the shop unbuyable.
- **(b)** Fix carry-over first (the WP `Access-Control-Expose-Headers: Nonce` filter the 2026-08-29 ADR names as the escape hatch), then place one order that tests the real path.
- **(c)** Something else — put the whole store on one origin.

That is a scope and live-service call. Surfaced, not decided.

## 6. Gate-4 lines this walk touches

- Blocker 3 (DNS cutover) — **resolved**, evidence in the contract §0.
- Blocker 4 (one real order, number logged) — **still open**, and now blocked on the §5 decision rather than just on scheduling.
