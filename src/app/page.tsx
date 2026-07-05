import { HomeScene } from "@/components/HomeScene/HomeScene";
import { LinerNotes } from "@/components/LinerNotes/LinerNotes";
import { Instagram } from "@/components/Instagram/Instagram";
import { EPK } from "@/components/EPK/EPK";
import { Discography } from "@/components/Discography/Discography";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { getEvents, type TribeEvent } from "@/lib/api/events";
import { getPage } from "@/lib/api/wordpress";
import { paragraphsFromHtml } from "@/lib/wp-content";
import styles from "./page.module.css";

// Bio prose for Liner Notes — from Meg's WP /about page. Empty on a blocked
// server render; LinerNotes then refetches in the browser.
async function safeBio(): Promise<string[]> {
  try {
    const page = await getPage("about");
    return paragraphsFromHtml(page?.content.rendered ?? "");
  } catch {
    return [];
  }
}

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
  const [upcomingRaw, pastRaw, bio] = await Promise.all([
    safeEvents("upcoming"),
    safeEvents("past"),
    safeBio(),
  ]);

  const upcoming = [...upcomingRaw].sort(byStart(1));
  const past = [...pastRaw].sort(byStart(-1));
  const justAdded = [...upcomingRaw].sort(byPublished);

  return (
    <div className={styles.page}>
      <HomeScene upcoming={upcoming} justAdded={justAdded} past={past} />
      <LinerNotes paragraphs={bio} />
      <Instagram />
      <EPK />
      <Discography />
      <SiteFooter />
    </div>
  );
}
