/**
 * Date/time formatting for show cards. The Events Calendar serves wall-clock
 * strings ("YYYY-MM-DD HH:MM:SS"); we read the fields by regex rather than
 * `new Date(...)` to dodge both the bare-number epoch trap (studio learning
 * #48) and timezone drift — the date a show is listed under must match the
 * venue's local date, not the server's.
 */

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;

export interface ShowDateParts {
  /** Three-letter month, e.g. "JUN". */
  month: string;
  /** Day of month with no leading zero, e.g. "5" or "12". */
  day: string;
}

/** Month abbreviation + day from a start_date string, or null if unparseable. */
export function parseShowDate(startDate: string): ShowDateParts | null {
  const m = DATE_RE.exec(startDate);
  if (!m) return null;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { month: MONTHS[monthIndex], day: String(Number(m[3])) };
}

function formatClock(hour: number, minute: number): string {
  const meridiem = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 || 12;
  const min = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`;
  return `${h12}${min}${meridiem}`;
}

/**
 * "@7pm–10pm" from start/end. Falls back to "@7pm" when the end time is
 * missing or unparseable, and to "" when the start itself can't be read.
 */
export function formatTimeRange(startDate: string, endDate?: string): string {
  const s = DATE_RE.exec(startDate);
  if (!s) return "";
  const start = formatClock(Number(s[4]), Number(s[5]));
  const e = endDate ? DATE_RE.exec(endDate) : null;
  if (!e) return `@${start}`;
  return `@${start}–${formatClock(Number(e[4]), Number(e[5]))}`;
}
