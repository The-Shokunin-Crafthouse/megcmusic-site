import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { Discography } from "@/components/Discography/Discography";
import { Singles } from "@/components/Singles/Singles";
import { MUSIC_PAGE, MUSIC_INTRO } from "@/lib/releases-content";
import { LIVE_FORMATS } from "@/lib/formats-content";
import { COLLAB } from "@/lib/collab-content";
import { FormatCard } from "./FormatCard";
import styles from "./music.module.css";
import { heroImage } from "@/lib/hero-images";

// The Music page changes only when Meg edits WordPress; refresh hourly so new
// intro copy appears without a redeploy. Same ISR window as /media and /epk.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: MUSIC_PAGE.metaTitle,
  description: MUSIC_PAGE.metaDescription,
};

export default function MusicPage() {
  // Optional intro prose from the WP Music page's body, read at build
  // (releases-content.ts) — the old request-time read never reached production.
  const intro = MUSIC_INTRO;

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

        {intro.length > 0 && (
          <section className={styles.section} aria-labelledby="music-liner">
            <div className={styles.inner}>
              <SectionLabel id="music-liner">Liner Notes</SectionLabel>
              <div className={styles.prose}>
                {intro.map((para, i) => (
                  <p key={i} className={styles.para}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Release + track listings — the shared discography (home, /epk). */}
        <Discography />

        {/* Standalone singles, off the album list — shared with Home. */}
        <Singles id="music-singles" surface="page" />

        {/* How she performs — name + blurb from her two Live Format pages
            (WP 2931 / 2939), photos from those pages' bodies. */}
        <section className={styles.section} aria-labelledby="music-formats">
          <div className={styles.inner}>
            <SectionLabel id="music-formats">Live Formats</SectionLabel>
            <div className={styles.formats}>
              {LIVE_FORMATS.map((f) => (
                <FormatCard key={f.slug} format={f} />
              ))}
            </div>
          </div>
        </section>

        {/* Work with me — community + business, from the WP Collabs page
            (WP 3742, "Work With Me" fields — Sprint 16 Phase 2). */}
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
      </main>
    </div>
  );
}
