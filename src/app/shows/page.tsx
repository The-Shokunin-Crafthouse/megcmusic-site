import type { Metadata } from "next";
import { Nav } from "@/components/Nav/Nav";
import {
  ShowsSection,
  type PastPagination,
} from "@/components/ShowsSection/ShowsSection";
import { getAllEvents, getEventsPage, type TribeEvent } from "@/lib/api/events";
import styles from "./shows.module.css";

// Shows refresh hourly, same cadence as the home section.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shows — MegCMusic",
  description:
    "Meghan Clarisse Cave's full show calendar — every upcoming date and the archive of shows already played.",
};

// Past shows load a page at a time. The archive is small today but its depth is
// unknown, so only the newest page renders at build; the rest load on demand.
const PAST_PAGE_SIZE = 10;

// String comparison sorts these "YYYY-MM-DD HH:MM:SS" stamps chronologically
// without constructing a Date (studio learning #48).
const byStart = (dir: 1 | -1) => (a: TribeEvent, b: TribeEvent) =>
  dir * a.start_date.localeCompare(b.start_date);

// "Just Added" = upcoming, newest publish date first. When the payload omits
// `date`, the comparison is a no-op and Up Next order is preserved.
const byPublished = (a: TribeEvent, b: TribeEvent) =>
  (b.date ?? "").localeCompare(a.date ?? "");

async function safeAllUpcoming(): Promise<TribeEvent[]> {
  try {
    return await getAllEvents("upcoming", 50);
  } catch {
    return [];
  }
}

// The tribe API sorts ascending, so the newest past shows are on the last page.
// Render that page reversed; hand the client the previous page to walk from.
async function loadPast(): Promise<{
  rows: TribeEvent[];
  pagination: PastPagination;
}> {
  try {
    const first = await getEventsPage("past", 1, PAST_PAGE_SIZE);
    if (first.totalPages <= 1) {
      return {
        rows: [...first.events].reverse(),
        pagination: { nextApiPage: 0, perPage: PAST_PAGE_SIZE },
      };
    }
    const last = await getEventsPage("past", first.totalPages, PAST_PAGE_SIZE);
    return {
      rows: [...last.events].reverse(),
      pagination: {
        nextApiPage: first.totalPages - 1,
        perPage: PAST_PAGE_SIZE,
      },
    };
  } catch {
    return {
      rows: [],
      pagination: { nextApiPage: 0, perPage: PAST_PAGE_SIZE },
    };
  }
}

export default async function ShowsPage() {
  const [upcomingRaw, past] = await Promise.all([safeAllUpcoming(), loadPast()]);

  const upcoming = [...upcomingRaw].sort(byStart(1));
  const justAdded = [...upcomingRaw].sort(byPublished);

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.stars} aria-hidden="true">
            ★★★
          </p>
          <h1 className={styles.title}>Shows</h1>
          <p className={styles.lede}>
            Every date on the calendar — and every one already played.
          </p>
        </header>

        <ShowsSection
          variant="page"
          upcoming={upcoming}
          justAdded={justAdded}
          past={past.rows}
          pastPagination={past.pagination}
        />
      </main>
    </div>
  );
}
