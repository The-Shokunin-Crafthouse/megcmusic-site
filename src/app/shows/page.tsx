import type { Metadata } from "next";
import { ShowsSection } from "@/components/ShowsSection/ShowsSection";
import { getAllEvents, type TribeEvent } from "@/lib/api/events";
import styles from "./shows.module.css";

// Shows refresh hourly, same cadence as the home section.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shows — MegCMusic",
  description:
    "Meghan Clarisse Cave's full show calendar — every upcoming date and the archive of shows already played.",
};

// String comparison sorts these "YYYY-MM-DD HH:MM:SS" stamps chronologically
// without constructing a Date (studio learning #48).
const byStart = (dir: 1 | -1) => (a: TribeEvent, b: TribeEvent) =>
  dir * a.start_date.localeCompare(b.start_date);

// "Just Added" = upcoming, newest publish date first. When the payload omits
// `date`, the comparison is a no-op and Up Next order is preserved.
const byPublished = (a: TribeEvent, b: TribeEvent) =>
  (b.date ?? "").localeCompare(a.date ?? "");

// Never let a flaky Events API break the build — fall back to an empty list,
// which the section renders as its empty state.
async function safeAll(status: "upcoming" | "past"): Promise<TribeEvent[]> {
  try {
    return await getAllEvents(status, 50);
  } catch {
    return [];
  }
}

export default async function ShowsPage() {
  const [upcomingRaw, pastRaw] = await Promise.all([
    safeAll("upcoming"),
    safeAll("past"),
  ]);

  const upcoming = [...upcomingRaw].sort(byStart(1));
  const justAdded = [...upcomingRaw].sort(byPublished);
  const past = [...pastRaw].sort(byStart(-1));

  return (
    <div className={styles.page}>
      {/* Same hero photo as the home page, full-bleed behind the listing, with
          a plum scrim so the cream cards keep their contrast. */}
      <img
        className={styles.bg}
        src="images/hero/meghan-hero.jpg"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.stars} aria-hidden="true">
              ★★★
            </p>
            <h1 className={styles.title}>Shows</h1>
            <p className={styles.lede}>
              Every date on the calendar — and every one already played.
            </p>
          </div>
        </header>

        <ShowsSection
          variant="page"
          upcoming={upcoming}
          justAdded={justAdded}
          past={past}
        />
      </main>
    </div>
  );
}
