import { HomeScene } from "@/components/HomeScene/HomeScene";
import { LinerNotes } from "@/components/LinerNotes/LinerNotes";
import { Instagram } from "@/components/Instagram/Instagram";
import { EPK } from "@/components/EPK/EPK";
import { Videos } from "@/components/Videos/Videos";
import { Newsletter } from "@/components/Newsletter/Newsletter";
import { Discography } from "@/components/Discography/Discography";
import { Singles } from "@/components/Singles/Singles";
import { BootScene } from "@/components/BootScene/BootScene";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { getEvents, type TribeEvent } from "@/lib/api/events";
import { HOME_CONTENT } from "@/lib/home-content";
import styles from "./page.module.css";

// Never let a flaky Events API break the build — fall back to an empty list,
// which the section renders as its empty state.
async function safeEvents(status: "upcoming" | "past"): Promise<TribeEvent[]> {
  try {
    return await getEvents(status);
  } catch {
    return [];
  }
}

// String comparison sorts these "YYYY-MM-DD HH:MM:SS" stamps chronologically
// without constructing a Date (studio learning #48).
const byStart = (dir: 1 | -1) => (a: TribeEvent, b: TribeEvent) =>
  dir * a.start_date.localeCompare(b.start_date);

// "Just Added" = upcoming, newest publish date first. When the payload omits
// `date`, the comparison is a no-op and Up Next order is preserved — no fake data.
const byPublished = (a: TribeEvent, b: TribeEvent) =>
  (b.date ?? "").localeCompare(a.date ?? "");

export default async function Home() {
  const [upcomingRaw, pastRaw] = await Promise.all([
    safeEvents("upcoming"),
    safeEvents("past"),
  ]);

  const upcoming = [...upcomingRaw].sort(byStart(1));
  const past = [...pastRaw].sort(byStart(-1));
  const justAdded = [...upcomingRaw].sort(byPublished);

  return (
    <div className={styles.page}>
      <HomeScene upcoming={upcoming} justAdded={justAdded} past={past} />
      <LinerNotes />
      <Instagram />
      <div className={styles.bootWrap}>
        <EPK />
        <BootScene />
      </div>
      <Videos />
      <Newsletter
        headline={HOME_CONTENT.newsletterHeadline}
        blurb={HOME_CONTENT.newsletterBlurb}
        birthdayNote={HOME_CONTENT.newsletterBirthdayNote}
      />
      <Discography />
      <Singles />
      <SiteFooter />
    </div>
  );
}
