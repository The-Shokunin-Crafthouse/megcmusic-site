import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { Discography } from "@/components/Discography/Discography";
import { getPage } from "@/lib/api/wordpress";
import { paragraphsFromHtml } from "@/lib/wp-content";
import { SINGLE_SLUGS, getReleaseDetail } from "@/config/releases";
import { LIVE_FORMATS } from "@/config/formats";
import { COLLAB_GROUPS, CAVE_CREW_URL } from "@/config/collaborate";
import { FormatCard } from "./FormatCard";
import styles from "./music.module.css";

// The Music page changes only when Meg edits WordPress; refresh hourly so new
// intro copy appears without a redeploy. Same ISR window as /media and /epk.
export const revalidate = 3600;

// Meg's WordPress Music page — the source for the optional intro prose. The old
// duplicate was retired and the maintained page took the clean `music` slug
// (2026-07-13). We read intro copy from here; everything else on /music is
// config, so this page only feeds the top paragraph when she writes one.
const MUSIC_SLUG = "music";

export const metadata: Metadata = {
  title: "Music — MegCMusic",
  description:
    "The music of Meghan Clarisse Cave — Americana with country roots and cowgirl boots. Stream every release or take one home.",
};

// Server-side parse of the WP Music page for genuine intro prose. That page is
// structurally a release gallery, so nearly every <p> is empty, a bare cover
// link, or a <strong> heading — keep only real sentences (several words) so
// that structural link/heading text never renders as a paragraph. Today this
// returns nothing (there is no intro copy); the day Meg writes one on the WP
// Music page, it flows straight through. A datacenter-blocked deploy returns
// nothing here too, and the page falls back to the release listing.
async function safeMusicIntro(): Promise<string[]> {
  try {
    const page = await getPage(MUSIC_SLUG);
    if (!page) return [];
    return paragraphsFromHtml(page.content.rendered).filter(
      (para) => para.split(/\s+/).length >= 6,
    );
  } catch {
    return [];
  }
}

export default async function MusicPage() {
  const intro = await safeMusicIntro();

  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src="/images/hero/meghan-hero.jpg"
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
            <p className={styles.lede}>
              Every release, in one place — stream Meghan Clarisse&apos;s records
              or take one home.
            </p>
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

        {/* Standalone singles — their own detail pages, off the album list. */}
        <section className={styles.section} aria-labelledby="music-singles">
          <div className={styles.inner}>
            <SectionLabel id="music-singles">Singles</SectionLabel>
            <ul className={styles.singles}>
              {SINGLE_SLUGS.map((slug) => {
                const single = getReleaseDetail(slug);
                if (!single) return null;
                return (
                  <li key={slug} className={styles.single}>
                    <Link className={styles.singleLink} href={`/music/${slug}`}>
                      <span className={styles.singleMeta}>
                        <span className={styles.singleYear}>{single.year}</span>
                        <span className={styles.singleStar} aria-hidden="true">
                          ★
                        </span>
                        <span className={styles.singleType}>{single.type}</span>
                      </span>
                      <span className={styles.singleTitle}>{single.title}</span>
                      <ArrowUpRight
                        className={styles.singleArrow}
                        size={18}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How she performs — photos from her WP format pages. */}
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

        {/* Work with me — community + business, from the WP Collabs page. */}
        <section className={styles.section} aria-labelledby="music-collab">
          <div className={styles.inner}>
            <SectionLabel id="music-collab">Work With Me</SectionLabel>
            <div className={styles.collab}>
              {COLLAB_GROUPS.map((g) => (
                <div key={g.heading} className={styles.collabGroup}>
                  <h3 className={styles.collabHeading}>{g.heading}</h3>
                  <p className={styles.collabBlurb}>{g.blurb}</p>
                  <ul className={styles.collabList}>
                    {g.offerings.map((o) => (
                      <li key={o} className={styles.collabItem}>
                        {o}
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
                href={CAVE_CREW_URL}
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
