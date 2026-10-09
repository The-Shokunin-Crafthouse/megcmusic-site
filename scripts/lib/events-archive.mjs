/**
 * Read the full Events Calendar archive (every show, past and upcoming) from
 * the TEC REST API, slimmed to the fields the site renders.
 *
 * The window is fixed dates, never TEC's `now`: that keyword rounds to the UTC
 * day (decisions.md, 2026-10-08). TEC caps `per_page` at 50, so the 400+ shows
 * take ~9 pages; they are read three at a time, because a burst of nine
 * parallel requests stalled the host for 40s+ on 2026-10-08.
 */
import { withRetry } from "./retry.mjs";
import { ARCHIVE_WINDOW, slimEvent } from "../../src/lib/tec-archive.mjs";

const PER_PAGE = 50;
const CONCURRENCY = 3;
const TIMEOUT_MS = 15_000;

/** @param {string} origin WordPress origin, e.g. https://admin.megcmusic.com */
export async function fetchArchive(origin) {
  const base = `${origin}/wp-json/tribe/events/v1/events?per_page=${PER_PAGE}&${ARCHIVE_WINDOW}`;
  const page = (n) =>
    withRetry(async () => {
      const res = await fetch(`${base}&page=${n}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      // The archive endpoint 404s when a date query matches nothing.
      if (res.status === 404) return { events: [], total_pages: 0 };
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} on page ${n}`);
      return res.json();
    });

  const first = await page(1);
  const events = [...(first.events ?? [])];
  for (let n = 2; n <= (first.total_pages ?? 0); n += CONCURRENCY) {
    const batch = [];
    for (let k = n; k < n + CONCURRENCY && k <= first.total_pages; k++) batch.push(page(k));
    for (const p of await Promise.all(batch)) events.push(...(p.events ?? []));
  }
  return events.map(slimEvent);
}
