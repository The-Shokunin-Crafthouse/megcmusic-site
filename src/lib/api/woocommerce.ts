/**
 * WooCommerce REST API (wc/v3) — products and store data.
 * Read access uses HTTP Basic auth built from the consumer
 * key/secret pair. Server-only: never import into a Client
 * Component — the credentials must not reach the browser.
 * Products are low-churn, so they revalidate daily.
 */

const WC_API_URL =
  process.env.WC_API_URL ?? "https://megcmusic.com/wp-json/wc/v3";

function authHeader(): string {
  const key = process.env.WC_CONSUMER_KEY ?? "";
  const secret = process.env.WC_CONSUMER_SECRET ?? "";
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export interface WcImage {
  id: number;
  src: string;
  alt: string;
}

export interface WcTerm {
  id: number;
  name: string;
  slug: string;
}

export interface WcProduct {
  id: number;
  slug: string;
  name: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  short_description: string;
  description: string;
  images: WcImage[];
  categories: WcTerm[];
}

async function wcFetch<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${WC_API_URL}${path}`, {
    headers: { Authorization: authHeader() },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`WooCommerce ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export function getProducts(): Promise<WcProduct[]> {
  return wcFetch<WcProduct[]>("/products?per_page=100&status=publish", 86400);
}

export async function getProduct(slug: string): Promise<WcProduct | null> {
  const products = await wcFetch<WcProduct[]>(
    `/products?slug=${encodeURIComponent(slug)}`,
    86400,
  );
  return products[0] ?? null;
}
