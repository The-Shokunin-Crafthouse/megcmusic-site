import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { ARTIST_LINKS } from "@/config/discography";
import { getFycCampaign } from "@/lib/fyc-content";
import styles from "./fyc.module.css";

const SLUG = "kindred-spirits";

// Archived campaign page — reachable by link, kept out of search and the nav.
// Content comes from the WP page Meg edits (ACF fields, read at build).
export async function generateMetadata(): Promise<Metadata> {
  const FYC = await getFycCampaign(SLUG);
  return {
    title: `For Your Consideration — ${FYC.album}`,
    description: `An archived awards submission for ${FYC.album} by ${FYC.artist} — ${FYC.category}, ${FYC.cycle}.`,
    robots: { index: false, follow: false },
  };
}

const LISTEN = [
  { label: "Apple Music", href: ARTIST_LINKS.apple },
  { label: "Spotify", href: ARTIST_LINKS.spotify },
  { label: "Amazon Music", href: ARTIST_LINKS.amazon },
];

export default async function FycPage() {
  const FYC = await getFycCampaign(SLUG);
  const VIDEO = FYC.videos[0];

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
            {FYC.about.map((paragraph) => (
              <p key={paragraph} className={styles.about}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {VIDEO ? (
          <section className={styles.section} aria-labelledby="fyc-watch">
            <div className={styles.inner}>
              <SectionLabel id="fyc-watch">Watch — {VIDEO.title}</SectionLabel>
              <a
                className={styles.video}
                href={`https://www.youtube.com/watch?v=${VIDEO.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Watch ${VIDEO.title} on YouTube`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.videoThumb}
                  src={`https://i.ytimg.com/vi/${VIDEO.id}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <PlayCircle className={styles.videoPlay} weight="fill" aria-hidden="true" />
              </a>
            </div>
          </section>
        ) : null}

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
              <Link className={styles.link} href={FYC.albumHref}>
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
