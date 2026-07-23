import type { TribeEvent, TribeEventsResponse } from "./events";
import { WP_ORIGIN } from "@/lib/wp-origin";

/**
 * Browser-side events fetch — the fallback when the server render came back
 * empty. The WP host blocks datacenter IPs (CI / Vercel serverless), so the
 * build and serverless runtime can't reach it, but the visitor's own
 * (residential) IP can, and WP's REST CORS echoes the request origin. So when
 * the server list is empty we refetch straight from the browser.
 */
const API_BASE = `${WP_ORIGIN}/wp-json/tribe/events/v1`;
const TIMEOUT_MS = 15_000;

/* Read-through sessionStorage cache so one fetch per session serves home,
   /shows, and back-navigations — the boot veil then genuinely shows once per
   session instead of on every route that falls back (2026-07-08 ADR). */
const CACHE_TTL_MS = 30 * 60_000;
const cacheKey = (status: "upcoming" | "past") => `mc-events-${status}`;

function readCache(status: "upcoming" | "past"): TribeEvent[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(status));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; events: TribeEvent[] };
    if (!Array.isArray(parsed.events)) return null;
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return parsed.events;
  } catch {
    // Unavailable storage (private mode) or corrupt payload — fetch instead.
    return null;
  }
}

function writeCache(status: "upcoming" | "past", events: TribeEvent[]): void {
  try {
    sessionStorage.setItem(
      cacheKey(status),
      JSON.stringify({ t: Date.now(), events }),
    );
  } catch {
    // Best-effort: a full or unavailable store just means a refetch next time.
  }
}

async function fetchPage(
  status: "upcoming" | "past",
  page: number,
  perPage: number,
): Promise<{ events: TribeEvent[]; totalPages: number }> {
  const bound = status === "upcoming" ? "start_date=now" : "end_date=now";
  const res = await fetch(
    `${API_BASE}/events?per_page=${perPage}&page=${page}&${bound}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) {
    if (res.status === 404) return { events: [], totalPages: 0 };
    throw new Error(`Events (${status} p${page}) → ${res.status}`);
  }
  const data = (await res.json()) as TribeEventsResponse;
  return { events: data.events ?? [], totalPages: data.total_pages ?? 0 };
}

/** Every event for a status, paginated to exhaustion in the browser. */
export async function fetchAllEventsBrowser(
  status: "upcoming" | "past",
): Promise<TribeEvent[]> {
  const cached = readCache(status);
  if (cached) return cached;
  const first = await fetchPage(status, 1, 50);
  const events =
    first.totalPages <= 1
      ? first.events
      : [
          first.events,
          ...(
            await Promise.all(
              Array.from({ length: first.totalPages - 1 }, (_, i) =>
                fetchPage(status, i + 2, 50),
              ),
            )
          ).map((p) => p.events),
        ].flat();
  writeCache(status, events);
  return events;
}
