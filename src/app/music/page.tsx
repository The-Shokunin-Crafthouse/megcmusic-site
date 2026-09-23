import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { Discography } from "@/components/Discography/Discography";
import { Singles } from "@/components/Singles/Singles";
import { MUSIC_PAGE, MUSIC_INTRO, MUSIC_LAYOUT } from "@/lib/releases-content";
import { PageLayout } from "@/components/Blocks/PageLayout";

import { EPK } from "@/components/EPK/EPK";
import { BootScene } from "@/components/BootScene/BootScene";
import { COLLAB } from "@/lib/collab-content";
import styles from "./music.module.css";
import { heroImage } from "@/lib/hero-images";

// The Music page changes only when Meg edits WordPress; refresh hourly so new
// intro copy appears without a redeploy. Same ISR window as /media and /epk.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: MUSIC_PAGE.metaTitle,
  description: MUSIC_PAGE.metaDescription,
};

const SECTIONS = {
  "liner-notes": () =>
    MUSIC_INTRO.length > 0 ? (
      <section className={styles.section} aria-labelledby="music-liner">
        <div className={styles.inner}>
          <SectionLabel id="music-liner">Liner Notes</SectionLabel>
          <div className={styles.prose}>
            {MUSIC_INTRO.map((para, i) => (
              <p key={i} className={styles.para}>
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>
    ) : null,
  discography: () => <Discography />,
  singles: () => <Singles id="music-singles" surface="page" />,
  // The home page's press-kit section, boot and all (2026-09-23): same rows,
  // edited once on the Press Kit page.
  "press-kit": () => (
    <div className={styles.bootWrap}>
      <EPK />
      <BootScene />
    </div>
  ),
  "work-with-me": () => (
    <section className={styles.section} aria-labelledby="music-collab">
      <div className={styles.inner}>
        <SectionLabel id="music-collab">Work With Me</SectionLabel>
        <div className={styles.collab}>
          {COLLAB.groups.map((g) => (
            <div key={g.heading} className={styles.collabGroup}>
              <h3 className={styles.collabHeading}>{g.heading}</h3>
              <p className={styles.collabBlurb}>{g.blurb}</p>
              <ul className={styles.collabList}>
                {g.offerings.map((o) => (
                  <li key={o.title} className={styles.collabItem}>
                    {o.detail ? `${o.title} — ${o.detail}` : o.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.collabActions}>
          <Link className={styles.collabCta} href="/booking">
            Book or collaborate
            <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
          </Link>
          <a
            className={styles.collabGhost}
            href={COLLAB.caveCrewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join the Cave Crew
            <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  ),
};

export default function MusicPage() {
  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src={heroImage("music")}
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
            <h1 className={styles.title}>Music</h1>
            <p className={styles.lede}>{MUSIC_PAGE.lede}</p>
          </div>
        </header>

        {/* Sprint 17: Meg's order from the Music page's "Page layout" list;
            SECTIONS names every id in src/lib/page-layouts.ts (music). */}
        <PageLayout items={MUSIC_LAYOUT} render={SECTIONS} />
      </main>
    </div>
  );
}
