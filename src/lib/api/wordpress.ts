/**
 * WordPress REST API (wp/v2) — pages and editorial content.
 * Pages change only on deploy, so they are fetched static at build
 * (revalidate: 0) per the project brief.
 */

import { WP_ORIGIN } from "@/lib/wp-origin";

// The env override is honored only when it parses as an absolute URL — the
// Vercel env delivers WP_API_URL set-but-invalid, and fetch then throws
// "Failed to parse URL" before any network I/O (masked for months by the
// silent catch → [] on every server-side page fetch; runs 33989616503,
// 34045385710 surfaced it when the FYC build started failing loudly).
function absoluteUrlOr(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    new URL(value);
    return value;
  } catch {
    return fallback;
  }
}
export const WP_API = absoluteUrlOr(
  process.env.WP_API_URL,
  `${WP_ORIGIN}/wp-json/wp/v2`,
);

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
  const res = await fetch(`${WP_API}${path}`, {
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
