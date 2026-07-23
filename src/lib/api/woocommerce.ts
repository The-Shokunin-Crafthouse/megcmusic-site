/**
 * WooCommerce REST API (wc/v3) — products, server-side. Read access uses HTTP
 * Basic auth from the consumer key/secret pair, so this module is server-only:
 * never import it into a Client Component — the credentials must not reach the
 * browser (the browser path is the public Store API in woocommerce-browser.ts).
 *
 * Products are low-churn, so they revalidate daily (ISR 24h). Every call is
 * bounded with AbortSignal.timeout so a slow/unreachable WP host can't hang a
 * build or an ISR revalidation — the same discipline as events.ts. Note the WP
 * host blocks datacenter IPs (2026-07-03 ADR): the build/serverless region is
 * usually blocked, the fetch fails fast into the caller's empty state, and the
 * browser Store-API fallback fills the data from the visitor's residential IP.
 */

import {
  USD,
  type ShopProduct,
  type ShopAttribute,
  type ShopImage,
} from "@/lib/shop";

import { WP_ORIGIN } from "@/lib/wp-origin";

const WC_API_URL =
  process.env.WC_API_URL ?? `${WP_ORIGIN}/wp-json/wc/v3`;

// Match the events-module bound: 25s ceiling, one retry for transient slowness.
// A hard datacenter-IP block still fails well within Next's static-generation
// timeout, dropping the caller into its empty state (then the browser fills it).
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;
const REVALIDATE_S = 86_400; // 24h — products are low-churn (brief).

function authHeader(): string {
  const key = process.env.WC_CONSUMER_KEY ?? "";
  const secret = process.env.WC_CONSUMER_SECRET ?? "";
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

/** Raw wc/v3 product — only the fields the shop consumes. Prices are decimal
 *  strings in major units ("14.99"); wc/v3 carries no per-product currency. */
interface WcRawProduct {
  id: number;
  slug: string;
  name: string;
  type: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  short_description: string;
  description: string;
  permalink: string;
  images: { id: number; src: string; alt: string }[];
  attributes: { id: number; name: string; options: string[]; variation: boolean }[];
}

// fetch() rejects only on network/timeout (not HTTP status), so one retry
// covers exactly the transient-slowness case; status handling stays in wcFetch.
async function wcRequest(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, {
        headers: { Authorization: authHeader() },
        next: { revalidate: REVALIDATE_S },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function wcFetch<T>(path: string): Promise<T> {
  const res = await wcRequest(`${WC_API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`WooCommerce ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Convert a wc/v3 decimal-major price ("14.99") to integer minor units (1499).
 *  Empty (variable products with no own price) → 0; the UI reads `inStock` /
 *  `purchasable` before offering a price, so 0 never renders as a real amount. */
function toMinor(major: string): number {
  if (!major) return 0;
  const value = Number.parseFloat(major);
  return Number.isFinite(value) ? Math.round(value * 10 ** USD.minorUnit) : 0;
}

function normalize(p: WcRawProduct): ShopProduct {
  const images: ShopImage[] = (p.images ?? []).map((img) => ({
    src: img.src,
    alt: img.alt || p.name,
  }));
  const attributes: ShopAttribute[] = (p.attributes ?? [])
    .filter((a) => a.variation && a.options?.length)
    .map((a) => ({ name: a.name, options: a.options }));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceMinor: toMinor(p.price),
    regularPriceMinor: toMinor(p.regular_price),
    onSale: Boolean(p.on_sale),
    currency: USD,
    shortDescriptionHtml: p.short_description ?? "",
    descriptionHtml: p.description ?? "",
    images,
    inStock: p.stock_status !== "outofstock",
    stockText: "",
    purchasable: p.purchasable !== false,
    type: p.type ?? "simple",
    attributes,
    permalink: p.permalink ?? "",
  };
}

/** All published products for the listing. Throws on a blocked/failed fetch so
 *  the page's try/catch renders empty and the browser fallback takes over. */
export async function getProducts(): Promise<ShopProduct[]> {
  const raw = await wcFetch<WcRawProduct[]>(
    "/products?per_page=100&status=publish&orderby=menu_order&order=asc",
  );
  return raw.map(normalize);
}

/** One product by slug, or null when it doesn't exist (a real 404). A blocked
 *  fetch throws — the detail page's try/catch then lets the browser fill in. */
export async function getProduct(slug: string): Promise<ShopProduct | null> {
  const raw = await wcFetch<WcRawProduct[]>(
    `/products?slug=${encodeURIComponent(slug)}&status=publish`,
  );
  return raw[0] ? normalize(raw[0]) : null;
}
