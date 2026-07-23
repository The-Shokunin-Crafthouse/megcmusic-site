/**
 * Relative-time formatting for outreach timestamps. Inputs are full Postgres
 * `timestamptz` ISO strings (e.g. "2026-07-05T12:34:56.789+00:00"), not bare
 * numbers, so `Date.parse` is safe here (the bare-number epoch trap, studio
 * learning #48, only bites on values like `new Date(2026)`). Guards NaN.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} min ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hr${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / DAY);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  // Older than a month: show the calendar date instead of a vague "N months".
  const date = new Date(then);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Absolute date for a `date` column ("YYYY-MM-DD"), e.g. cooling_until. */
export function calendarDate(ymd: string | null): string {
  if (!ymd) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return "";
  const [, y, m, d] = match;
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthIndex = Number(m) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${MONTHS[monthIndex]} ${Number(d)}, ${y}`;
}
