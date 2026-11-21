# Phase 1.2b — The live order (Levi runs it)

**Sprint:** 14 · **Status: NOT RUN.** Blocked on 1.2a (cart carry-over), see below.

## Why it is not runnable yet
Phase 1.1 found that the cart never reaches WooCommerce from the apex: the Store API write is never reached across the `megcmusic.com` / `admin.megcmusic.com` split, so a visitor lands on an empty cart. Levi's call of 2026-09-14 puts the fix (1.2a) before the order, so the order tests the real hand-off. **1.2a has not been built.** It is a change to her live WordPress configuration: a filter in the `megc-site-content` plugin that lets the front end read the Store API's `Nonce` header (and send `Nonce` / `Cart-Token`) cross-origin. Merging a plugin version bump to `main` installs it on the live site automatically (`wp-plugin-release.yml`), so it needs Levi's go-ahead as a separate decision. It is verified only by watching a real cart survive the hand-off, never by the filter being present (learning #45).

## Steps once 1.2a is live
1. On `megcmusic.com`, add one inexpensive product (the $6.00 Cowgirl Boot Koozie is the cheapest). Open the cart drawer; confirm line, quantity, subtotal.
2. Click Checkout. **Expected after 1.2a:** you land on `admin.megcmusic.com/cart/` with that line already in the cart. **If the cart is empty, stop:** 1.2a failed; do not pay.
3. Continue to checkout and pay with PayPal.
4. Record below. Then log the order number in `decisions/decisions.md` (the 2026-07-05 ADR asks for it) and check it appears in her WooCommerce orders list.

## Fields
| Field | Value |
|---|---|
| Product | |
| Total (incl. shipping/tax) | |
| Order number | |
| Time placed / time order appeared in Woo | |
| Confirmation screen said | |
| Confirmation email said (and from which address) | |
| PayPal payment visible in her PayPal | |
| Refunded afterwards? | |

Stop conditions (contract §7): the checkout does something other than described; the order fails; the order succeeds but does not reach her Woo order list.
