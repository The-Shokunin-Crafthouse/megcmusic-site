/**
 * Checkout hand-off — the logged ADR path: keep the browse cart in-app (Zustand)
 * and, at checkout, replay the lines into the REAL WooCommerce cart via the
 * public Store API, then hand the visitor to her existing Woo/PayPal checkout
 * so her gateway is never touched and no payment code or secret lives here.
 *
 * IMPORTANT — origin dependency. The Store API cart WRITE requires a `Nonce`
 * header, and WooCommerce does NOT CORS-expose the `nonce` response header
 * (only `Cart-Token` is exposed). So this completes only when the front-end
 * shares WooCommerce's origin — the launch model (Vercel + WP both on
 * megcmusic.com). On a cross-origin deploy (e.g. the *.vercel.app preview) the
 * nonce is unreadable, so we surface a CheckoutOriginError and offer her live
 * store as the fallback rather than sending anyone to an empty checkout. This
 * is why checkout is verified against the same-origin staging/production domain,
 * not the cross-origin preview.
 */

"use client";

import { type CartLine } from "@/lib/shop";

const STORE_API = "https://megcmusic.com/wp-json/wc/store/v1";
// Land on her cart page (review + pay) rather than jumping straight to payment.
export const LIVE_CHECKOUT_URL = "https://www.megcmusic.com/cart/";

/** Thrown when the Store API cart can't be written because the front-end is a
 *  different origin than WooCommerce (the nonce header isn't CORS-exposed). */
export class CheckoutOriginError extends Error {
  constructor() {
    super("Checkout requires the store's own origin (nonce not readable cross-origin).");
    this.name = "CheckoutOriginError";
  }
}

/**
 * Populate the real WooCommerce cart from the in-app cart, then redirect to her
 * checkout. Resolves by navigating away; throws CheckoutOriginError when run
 * cross-origin, or a generic Error if a line can't be added (e.g. it just sold
 * out) so the drawer can show a real error state.
 */
export async function handoffToCheckout(lines: CartLine[]): Promise<void> {
  if (lines.length === 0) return;

  // credentials:'include' shares WooCommerce's session cookie same-origin, so
  // the classic checkout reads the very cart we populate here.
  // A cross-origin front-end can't even complete this GET: the browser rejects
  // the credentialed CORS request with a TypeError ("Failed to fetch") before any
  // header is readable. That's the same origin limitation as an unreadable nonce,
  // so surface it as CheckoutOriginError — never a generic "try again" (a retry
  // can never succeed cross-origin, so that message lies to the visitor).
  let cartRes: Response;
  try {
    cartRes = await fetch(`${STORE_API}/cart`, { credentials: "include" });
  } catch {
    throw new CheckoutOriginError();
  }
  const nonce = cartRes.headers.get("Nonce");
  const cartToken = cartRes.headers.get("Cart-Token") ?? "";

  if (!nonce) throw new CheckoutOriginError();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Nonce: nonce,
    "Cart-Token": cartToken,
  };

  for (const line of lines) {
    const res = await fetch(`${STORE_API}/cart/add-item`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ id: line.id, quantity: line.quantity }),
    });
    if (!res.ok) {
      throw new Error(`Could not add "${line.name}" to checkout (${res.status}).`);
    }
  }

  window.location.href = LIVE_CHECKOUT_URL;
}
