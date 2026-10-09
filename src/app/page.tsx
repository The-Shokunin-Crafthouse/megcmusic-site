import { HomeScene } from "@/components/HomeScene/HomeScene";
import { LinerNotes } from "@/components/LinerNotes/LinerNotes";
import { Instagram } from "@/components/Instagram/Instagram";
import { WhatsNew } from "@/components/Blocks/WhatsNew";
import { PageLayout } from "@/components/Blocks/PageLayout";
import { EPK } from "@/components/EPK/EPK";
import { Videos } from "@/components/Videos/Videos";
import { Newsletter } from "@/components/Newsletter/Newsletter";
import { Discography } from "@/components/Discography/Discography";
import { Singles } from "@/components/Singles/Singles";
import { BootScene } from "@/components/BootScene/BootScene";
import type { TribeEvent } from "@/lib/api/events";
import archive from "@/generated/wp-content/events.json";
import { HOME_ROWS, splitShows } from "@/lib/show-split";
import { HOME_CONTENT } from "@/lib/home-content";
import styles from "./page.module.css";

const SECTIONS = {
  "liner-notes": () => <LinerNotes />,
  instagram: () => <Instagram />,
  "whats-new": () => <WhatsNew />,
  "press-kit": () => (
    <div className={styles.bootWrap}>
      <EPK />
      <BootScene />
    </div>
  ),
  videos: () => <Videos />,
  "mailing-list": () => (
    <Newsletter
      headline={HOME_CONTENT.newsletterHeadline}
      blurb={HOME_CONTENT.newsletterBlurb}
      birthdayNote={HOME_CONTENT.newsletterBirthdayNote}
    />
  ),
  discography: () => <Discography />,
  singles: () => <Singles />,
};

export default function Home() {
  const splitAt = Date.now();
  // Home lists at most HOME_ROWS a tab, so ship every upcoming show (the
  // client re-splits them as they end) plus only the most recent past ones.
  const { upcoming, past } = splitShows(archive as TribeEvent[], splitAt);
  const events = [...upcoming, ...past.slice(0, HOME_ROWS)];

  return (
    <div className={styles.page}>
      <HomeScene events={events} splitAt={splitAt} />
      {/* Sprint 17: Meg's order, from Home's "Page layout" list; the map
          below names every section in src/lib/page-layouts.ts (home). */}
      <PageLayout items={HOME_CONTENT.layout} render={SECTIONS} />
    </div>
  );
}
