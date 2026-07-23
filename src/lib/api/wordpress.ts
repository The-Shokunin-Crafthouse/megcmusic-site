/**
 * WordPress REST API (wp/v2) — pages and editorial content.
 * Pages change only on deploy, so they are fetched static at build
 * (revalidate: 0) per the project brief.
 */

import { WP_ORIGIN } from "@/lib/wp-origin";

const WP_API_URL =
  process.env.WP_API_URL ?? `${WP_ORIGIN}/wp-json/wp/v2`;

export interface WpRendered {
  rendered: string;
}

export interface WpPage {
  id: number;
  slug: string;
  status: string;
  link: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
}

// Bound every call so a slow/blocked upstream (the WP host blocks datacenter
// IPs — see events.ts) can't hang the ISR build; the caller falls back to the
// empty state and the browser refetches from the visitor's residential IP.
const TIMEOUT_MS = 12_000;

async function wpFetch<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${WP_API_URL}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`WordPress ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export function getPages(): Promise<WpPage[]> {
  return wpFetch<WpPage[]>("/pages?per_page=100", 0);
}

export async function getPage(slug: string): Promise<WpPage | null> {
  const pages = await wpFetch<WpPage[]>(
    `/pages?slug=${encodeURIComponent(slug)}`,
    0,
  );
  return pages[0] ?? null;
}
