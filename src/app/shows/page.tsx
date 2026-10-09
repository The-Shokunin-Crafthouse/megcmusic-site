import type { Metadata } from "next";
import { ShowsSection } from "@/components/ShowsSection/ShowsSection";
import { getAllEvents, type TribeEvent } from "@/lib/api/events";
import styles from "./shows.module.css";
import { heroImage } from "@/lib/hero-images";
import { SHOWS_PAGE, SHOWS_LAYOUT } from "@/lib/page-basics";
import { PageLayout } from "@/components/Blocks/PageLayout";

// Shows refresh hourly, same cadence as the home section.
export const revalidate = 3600;

// Lede and metadata from the Shows page in Meg's dashboard (WP page 20,
// "Page Basics" field group) — Sprint 16 Phase 2.
export const metadata: Metadata = {
  title: SHOWS_PAGE.metaTitle,
  description: SHOWS_PAGE.metaDescription,
};

// Never let a flaky Events API break the build — fall back to an empty list,
// which the section renders as its empty state.
async function safeAll(): Promise<TribeEvent[]> {
  try {
    return await getAllEvents(50);
  } catch {
    return [];
  }
}

export default async function ShowsPage() {
  const events = await safeAll();
  const splitAt = Date.now();
  const sections = {
    shows: () => (
      <ShowsSection
        variant="page"
        events={events}
        splitAt={splitAt}
      />
    ),
  };

  return (
    <div className={styles.page}>
      {/* Same hero photo as the home page, full-bleed behind the listing, with
          a plum scrim so the cream cards keep their contrast. */}
      <img
        className={styles.bg}
        src={heroImage("shows")}
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
            <p className={styles.lede}>{SHOWS_PAGE.lede}</p>
          </div>
        </header>

        {/* Sprint 17: the Shows page's "Page layout" list. */}
        <PageLayout items={SHOWS_LAYOUT} render={sections} />
      </main>
    </div>
  );
}
