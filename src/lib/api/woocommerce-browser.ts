/**
 * Browser-side product fetch — the fallback when the server render came back
 * empty because the WP host blocks datacenter IPs (CI / Vercel serverless). The
 * visitor's residential IP can reach WooCommerce, and the Store API is public
 * (no credentials) with CORS that echoes the request origin, so a plain
 * cross-origin GET succeeds. Mirrors events-browser.ts / wordpress-browser.ts.
 *
 * This deliberately uses the public Store API (/wc/store), NOT wc/v3 — the
 * consumer key/secret must never reach the browser. Prices already arrive in
 * minor units here, so normalisation is straightforward.
 */

import {
  type ShopProduct,
  type ShopAttribute,
  type ShopImage,
  type ShopCurrency,
} from "@/lib/shop";

const STORE_API = "https://megcmusic.com/wp-json/wc/store/v1";
const TIMEOUT_MS = 15_000;

interface StorePrices {
  price: string;
  regular_price: string;
  currency_code: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

interface StoreProduct {
  id: number;
  slug: string;
  name: string;
  type: string;
  permalink: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  is_in_stock: boolean;
  is_purchasable: boolean;
  prices: StorePrices;
  stock_availability?: { text?: string };
  images: { src: string; thumbnail?: string; alt: string }[];
  attributes: { name: string; has_variations: boolean; terms: { name: string }[] }[];
}

function currencyOf(prices: StorePrices): ShopCurrency {
  return {
    code: prices.currency_code || "USD",
    minorUnit: prices.currency_minor_unit ?? 2,
    prefix: prices.currency_prefix ?? "$",
    suffix: prices.currency_suffix ?? "",
    decimalSeparator: prices.currency_decimal_separator ?? ".",
    thousandSeparator: prices.currency_thousand_separator ?? ",",
  };
}

function normalize(p: StoreProduct): ShopProduct {
  const currency = currencyOf(p.prices);
  const images: ShopImage[] = (p.images ?? []).map((img) => ({
    src: img.src,
    thumbnail: img.thumbnail,
    alt: img.alt || p.name,
  }));
  const attributes: ShopAttribute[] = (p.attributes ?? [])
    .filter((a) => a.has_variations && a.terms?.length)
    .map((a) => ({ name: a.name, options: a.terms.map((t) => t.name) }));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceMinor: Number.parseInt(p.prices.price, 10) || 0,
    regularPriceMinor: Number.parseInt(p.prices.regular_price, 10) || 0,
    onSale: Boolean(p.on_sale),
    currency,
    shortDescriptionHtml: p.short_description ?? "",
    descriptionHtml: p.description ?? "",
    images,
    inStock: p.is_in_stock !== false,
    stockText: p.stock_availability?.text ?? "",
    purchasable: p.is_purchasable !== false,
    type: p.type ?? "simple",
    attributes,
    permalink: p.permalink ?? "",
  };
}

/** Every published product, from the browser. THROWS on a network/timeout/HTTP
 *  failure so the caller can distinguish a real error from a genuinely empty
 *  catalogue (an ok response with []); a successful fetch returns the list. */
export async function fetchProductsBrowser(): Promise<ShopProduct[]> {
  const res = await fetch(`${STORE_API}/products?per_page=100`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Store API products → ${res.status}`);
  const data = (await res.json()) as StoreProduct[];
  return data.map(normalize);
}

/** One product by slug, from the browser. Returns null for a real 404 (no such
 *  product); THROWS on network/timeout/HTTP failure so the caller can tell
 *  "unreachable" (retryable) from "not found" (terminal). */
export async function fetchProductBrowser(
  slug: string,
): Promise<ShopProduct | null> {
  const res = await fetch(
    `${STORE_API}/products?slug=${encodeURIComponent(slug)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`Store API product ${slug} → ${res.status}`);
  const data = (await res.json()) as StoreProduct[];
  return data[0] ? normalize(data[0]) : null;
}
