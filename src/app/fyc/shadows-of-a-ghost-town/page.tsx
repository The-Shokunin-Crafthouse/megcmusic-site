import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { ARTIST_LINKS } from "@/config/discography";
import { FYC_CAMPAIGNS } from "@/config/fyc";
import styles from "./fyc-live.module.css";

const FYC = FYC_CAMPAIGNS["shadows-of-a-ghost-town"];

// LIVE campaign page — indexable, on the nav (/fyc redirects here). Every
// section renders only once its config content exists, so the page grows as
// Levi drops the campaign content into src/config/fyc.ts without code changes.
export const metadata: Metadata = {
  title: `For Your Consideration — ${FYC.album}`,
  description: `${FYC.album} (2025) by ${FYC.artist} — for your consideration. Press, live performances, and lyrics from her full-length album, an evocative exploration of death, nature, and the soul of the West.`,
  alternates: { canonical: `/fyc/${FYC.slug}` },
  openGraph: {
    title: `For Your Consideration — ${FYC.album}`,
    description: `${FYC.album} (2025) by ${FYC.artist} — press, live performances, and lyrics.`,
    url: `/fyc/${FYC.slug}`,
    type: "website",
    images: [{ url: "/images/hero/meghan-hero.jpg" }],
  },
};

const LISTEN = [
  { label: "Apple Music", href: ARTIST_LINKS.apple },
  { label: "Spotify", href: ARTIST_LINKS.spotify },
  { label: "Amazon Music", href: ARTIST_LINKS.amazon },
];

export default function FycLivePage() {
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
            <p className={styles.eyebrow}>For Your Consideration</p>
            <h1 className={styles.title}>{FYC.album}</h1>
            {FYC.category ? <p className={styles.category}>{FYC.category}</p> : null}
            {FYC.cycle ? <p className={styles.cycle}>{FYC.cycle}</p> : null}
            {FYC.releaseMeta ? (
              <p className={styles.releaseMeta}>{FYC.releaseMeta}</p>
            ) : null}
          </div>
        </header>

        {FYC.quotes.length > 0 ? (
          <section className={styles.section} aria-labelledby="fyc-press">
            <div className={styles.inner}>
              <SectionLabel id="fyc-press">What People Are Saying</SectionLabel>
              <div className={styles.quotes}>
                {FYC.quotes.map((q) => (
                  <figure key={q.source} className={styles.quote}>
                    <blockquote className={styles.quoteText}>
                      {q.quote}
                    </blockquote>
                    <figcaption className={styles.quoteSource}>
                      {q.source}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {FYC.about.length > 0 ? (
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
        ) : null}

        {FYC.videos.length > 0 ? (
          <section className={styles.section} aria-labelledby="fyc-watch">
            <div className={styles.inner}>
              <SectionLabel id="fyc-watch">Watch Live</SectionLabel>
              <div className={styles.videos}>
                {FYC.videos.map((video) => (
                  <a
                    key={video.id}
                    className={styles.video}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${video.title} on YouTube`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.videoThumb}
                      src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                      alt=""
                      width={480}
                      height={360}
                      loading="lazy"
                      decoding="async"
                    />
                    <PlayCircle
                      className={styles.videoPlay}
                      weight="fill"
                      aria-hidden="true"
                    />
                    <span className={styles.videoTitle}>{video.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {FYC.lyricSheets.length > 0 ? (
          <section className={styles.section} aria-labelledby="fyc-lyrics">
            <div className={styles.inner}>
              <SectionLabel id="fyc-lyrics">The Lyrics</SectionLabel>
              <div className={styles.lyrics}>
                {FYC.lyricSheets.map((sheet) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={sheet.src}
                    className={styles.lyricSheet}
                    src={sheet.src}
                    alt={sheet.alt}
                    width={sheet.width}
                    height={sheet.height}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
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
