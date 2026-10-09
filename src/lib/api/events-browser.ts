import type { TribeEvent, TribeEventsResponse } from "./events";
import { ARCHIVE_WINDOW, slimEvent } from "@/lib/show-split";
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
/* The cache holds the raw archive; the upcoming/past split runs on every read
   against the current clock, so a cached list never pins a show that ended. */
const CACHE_KEY = "mc-events-all";

function readCache(): TribeEvent[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
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

function writeCache(events: TribeEvent[]): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ t: Date.now(), events }),
    );
  } catch {
    // Best-effort: a full or unavailable store just means a refetch next time.
  }
}

async function fetchPage(
  page: number,
  perPage: number,
): Promise<{ events: TribeEvent[]; totalPages: number }> {
  const res = await fetch(
    `${API_BASE}/events?per_page=${perPage}&page=${page}&${ARCHIVE_WINDOW}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) {
    if (res.status === 404) return { events: [], totalPages: 0 };
    throw new Error(`Events (p${page}) → ${res.status}`);
  }
  const data = (await res.json()) as TribeEventsResponse;
  return {
    events: (data.events ?? []).map(slimEvent),
    totalPages: data.total_pages ?? 0,
  };
}

/** Every show, past and upcoming, paginated to exhaustion in the browser. */
export async function fetchAllEventsBrowser(): Promise<TribeEvent[]> {
  const cached = readCache();
  if (cached) return cached;
  const first = await fetchPage(1, 50);
  const events =
    first.totalPages <= 1
      ? first.events
      : [
          first.events,
          ...(
            await Promise.all(
              Array.from({ length: first.totalPages - 1 }, (_, i) =>
                fetchPage(i + 2, 50),
              ),
            )
          ).map((p) => p.events),
        ].flat();
  writeCache(events);
  return events;
}
