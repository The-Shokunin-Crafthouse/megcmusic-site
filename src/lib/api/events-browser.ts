import type { TribeEvent, TribeEventsResponse } from "./events";

/**
 * Browser-side events fetch — the fallback when the server render came back
 * empty. The WP host blocks datacenter IPs (CI / Vercel serverless), so the
 * build and serverless runtime can't reach it, but the visitor's own
 * (residential) IP can, and WP's REST CORS echoes the request origin. So when
 * the server list is empty we refetch straight from the browser.
 */
const API_BASE = "https://megcmusic.com/wp-json/tribe/events/v1";
const TIMEOUT_MS = 15_000;

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
  const first = await fetchPage(status, 1, 50);
  if (first.totalPages <= 1) return first.events;
  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      fetchPage(status, i + 2, 50),
    ),
  );
  return [first.events, ...rest.map((p) => p.events)].flat();
}
