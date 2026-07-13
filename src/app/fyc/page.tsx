import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { ARTIST_LINKS } from "@/config/discography";
import { FYC } from "@/config/fyc";
import styles from "./fyc.module.css";

// Archived campaign page — reachable by link, kept out of search and the nav.
export const metadata: Metadata = {
  title: `For Your Consideration — ${FYC.album}`,
  description: `An archived awards submission for ${FYC.album} by ${FYC.artist} — ${FYC.category}, ${FYC.cycle}.`,
  robots: { index: false, follow: false },
};

const LISTEN = [
  { label: "Apple Music", href: ARTIST_LINKS.apple },
  { label: "Spotify", href: ARTIST_LINKS.spotify },
  { label: "Amazon Music", href: ARTIST_LINKS.amazon },
];

export default function FycPage() {
  const watch = `https://www.youtube.com/watch?v=${FYC.videoId}`;
  const thumb = `https://i.ytimg.com/vi/${FYC.videoId}/hqdefault.jpg`;

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
            <p className={styles.eyebrow}>For Your Consideration · Archived</p>
            <h1 className={styles.title}>{FYC.album}</h1>
            <p className={styles.category}>{FYC.category}</p>
            <p className={styles.cycle}>{FYC.cycle}</p>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="fyc-about">
          <div className={styles.inner}>
            <SectionLabel id="fyc-about">About the Album</SectionLabel>
            <p className={styles.about}>{FYC.about}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="fyc-watch">
          <div className={styles.inner}>
            <SectionLabel id="fyc-watch">Watch — {FYC.videoTitle}</SectionLabel>
            <a
              className={styles.video}
              href={watch}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${FYC.videoTitle} on YouTube`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.videoThumb}
                src={thumb}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <PlayCircle className={styles.videoPlay} weight="fill" aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="fyc-listen">
          <div className={styles.inner}>
            <SectionLabel id="fyc-listen">Listen</SectionLabel>
            <div className={styles.links}>
              {LISTEN.map((l) => (
                <a
                  key={l.label}
                  className={styles.link}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label}
                  <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="fyc-more">
          <div className={styles.inner}>
            <SectionLabel id="fyc-more">More</SectionLabel>
            <div className={styles.links}>
              <Link className={styles.link} href="/music/kindred-spirits">
                The album
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </Link>
              <Link className={styles.link} href="/epk">
                Press kit
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </Link>
              <Link className={styles.link} href="/booking">
                Contact
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
