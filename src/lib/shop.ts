/**
 * Shop domain types + pure helpers — client-safe (no server-only imports, no
 * credentials). Both data paths normalise into `ShopProduct`:
 *   • server  — WooCommerce wc/v3 (authenticated) in `api/woocommerce.ts`
 *   • browser — the public WC Store API in `api/woocommerce-browser.ts`, the
 *     residential-IP fallback for the datacenter-IP block (mirrors the events
 *     pattern). The two upstreams disagree on shape — chiefly price units
 *     (wc/v3 major "6.00" vs Store API minor "600") — so everything downstream
 *     (cards, detail, cart) speaks only `ShopProduct`.
 */

/** Store currency. WooCommerce is configured USD; the Store API confirms
 *  minor-unit 2 and a "$" prefix. wc/v3 carries no per-product currency, so the
 *  server path assumes these defaults (logged in the shop ADR). */
export interface ShopCurrency {
  code: string;
  minorUnit: number;
  prefix: string;
  suffix: string;
  decimalSeparator: string;
  thousandSeparator: string;
}

export const USD: ShopCurrency = {
  code: "USD",
  minorUnit: 2,
  prefix: "$",
  suffix: "",
  decimalSeparator: ".",
  thousandSeparator: ",",
};

export interface ShopImage {
  src: string;
  /** Small square rendition when the upstream provides one (Store API). */
  thumbnail?: string;
  alt: string;
}

/** A selectable attribute on a variable product. The live catalogue is 100%
 *  simple products, so this is defensive: the detail page renders selectors
 *  only when a product actually carries variation attributes. */
export interface ShopAttribute {
  name: string;
  options: string[];
}

export interface ShopProduct {
  id: number;
  slug: string;
  name: string;
  /** Price in the currency's minor unit (integer cents for USD). */
  priceMinor: number;
  regularPriceMinor: number;
  onSale: boolean;
  currency: ShopCurrency;
  shortDescriptionHtml: string;
  descriptionHtml: string;
  images: ShopImage[];
  inStock: boolean;
  /** Upstream stock phrasing ("In stock", "Only 2 left") when present. */
  stockText: string;
  purchasable: boolean;
  type: string;
  /** Variation attributes — empty for simple products. */
  attributes: ShopAttribute[];
  /** The product's canonical WordPress URL (used only for reference/links). */
  permalink: string;
}

/** The minimal line-item shape the cart persists — a snapshot, so a cart
 *  survives even if a product is later edited or unpublished in WooCommerce. */
export interface CartLine {
  id: number;
  slug: string;
  name: string;
  priceMinor: number;
  currency: ShopCurrency;
  image?: ShopImage;
  quantity: number;
}

/** Format a minor-unit amount as a display price, e.g. 1499 → "$14.99".
 *  Grouping and separators follow the currency, not the visitor's locale, so
 *  the shop reads identically to her WooCommerce store. */
export function formatPrice(minor: number, currency: ShopCurrency = USD): string {
  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const factor = 10 ** currency.minorUnit;
  const whole = Math.floor(abs / factor).toString();
  const fraction = (abs % factor).toString().padStart(currency.minorUnit, "0");

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
  const body =
    currency.minorUnit > 0
      ? `${grouped}${currency.decimalSeparator}${fraction}`
      : grouped;

  return `${negative ? "-" : ""}${currency.prefix}${body}${currency.suffix}`;
}

/** Sum a set of cart lines to a minor-unit subtotal. */
export function subtotalMinor(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceMinor * l.quantity, 0);
}

/** Total item count across cart lines (for the cart-trigger badge). */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Request a width-constrained rendition from Jetpack/Photon (i*.wp.com), the
 *  CDN already in front of every WooCommerce image — so grid tiles and detail
 *  renditions cost nothing to add and keep the payload small. Strips any
 *  existing sizing params so the new width wins; a non-Photon URL is returned
 *  untouched (it still loads at its stored size). Mirrors media-photos.ts. */
export function photonWidth(src: string, width: number): string {
  try {
    const url = new URL(src);
    if (!/(^|\.)wp\.com$/.test(url.hostname)) return src;
    for (const p of ["fit", "resize", "w", "h", "crop"]) url.searchParams.delete(p);
    url.searchParams.set("w", String(width));
    url.searchParams.set("ssl", "1");
    return url.toString();
  } catch {
    return src;
  }
}
