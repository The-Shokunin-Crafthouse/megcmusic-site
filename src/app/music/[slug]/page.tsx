import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { HeroCover } from "./HeroCover";
import { getPage } from "@/lib/api/wordpress";
import {
  parseReleaseContent,
  EMPTY_RELEASE_CONTENT,
  type ReleaseContent,
} from "@/lib/release-content";
import { ARTIST_LINKS } from "@/lib/releases-content";
import {
  RELEASE_DETAILS,
  getReleaseDetail,
  type ReleaseDetail,
} from "@/lib/releases-content";
import { getReviews } from "@/config/reviews";
import { ReleaseBody } from "./ReleaseBody";
import styles from "./release.module.css";
import { heroImage } from "@/lib/hero-images";

// The release's prose + lyric sheets change only when Meg edits WordPress;
// refresh hourly, same as the other WP-sourced surfaces.
export const revalidate = 3600;

export function generateStaticParams() {
  return RELEASE_DETAILS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const release = getReleaseDetail(slug);
  if (!release) return { title: "Music — MegCMusic" };
  return {
    title: `${release.title} — Meghan Clarisse`,
    description: `${release.title} (${release.year}) by Meghan Clarisse Cave — listen, read the story, and follow along with the lyrics.`,
  };
}

async function safeContent(wpSlug: string): Promise<ReleaseContent> {
  try {
    const page = await getPage(wpSlug);
    return page ? parseReleaseContent(page.content.rendered) : EMPTY_RELEASE_CONTENT;
  } catch {
    return EMPTY_RELEASE_CONTENT;
  }
}

function streamingLinks(release: ReleaseDetail) {
  const buy = release.productSlug
    ? `/shop/${release.productSlug}`
    : ARTIST_LINKS.buy;
  return [
    { label: "Spotify", href: release.spotify ?? ARTIST_LINKS.spotify, external: true },
    { label: "Apple Music", href: release.apple ?? ARTIST_LINKS.apple, external: true },
    { label: "Buy", href: buy, external: !release.productSlug, buy: true },
  ];
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = getReleaseDetail(slug);
  if (!release) notFound();

  const [content, reviews] = [await safeContent(release.wpSlug), getReviews(slug)];
  const links = streamingLinks(release);

  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src={heroImage(`release-${release.wpSlug}`)}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link className={styles.back} href="/music">
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              All music
            </Link>

            <div className={styles.hero}>
              <div className={styles.coverWrap}>
                <HeroCover
                  title={release.title}
                  productSlug={release.productSlug}
                  pageSlug={release.wpSlug}
                />
              </div>

              <div className={styles.heroText}>
                <p className={styles.meta}>
                  <span className={styles.year}>{release.year}</span>
                  <span className={styles.star} aria-hidden="true">
                    ★
                  </span>
                  <span className={styles.type}>{release.type}</span>
                </p>
                <h1 className={styles.title}>{release.title}</h1>

                <div className={styles.listen}>
                  {links.map((l) => (
                    <a
                      key={l.label}
                      className={`${styles.listenLink} ${l.buy ? styles.listenBuy : ""}`}
                      href={l.href}
                      {...(l.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {l.label}
                      <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <ReleaseBody wpSlug={release.wpSlug} server={content} />

        {reviews.length > 0 && (
          <section className={styles.section} aria-labelledby="release-press">
            <div className={styles.inner}>
              <SectionLabel id="release-press">What People Are Saying</SectionLabel>
              <ul className={styles.reviews}>
                {reviews.map((r, i) => (
                  <li key={i} className={styles.review}>
                    {r.quote && <p className={styles.reviewQuote}>“{r.quote}”</p>}
                    {r.accolade && (
                      <p className={styles.reviewAccolade}>{r.accolade}</p>
                    )}
                    <p className={styles.reviewSource}>
                      {r.href ? (
                        <a
                          className={styles.reviewLink}
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.source}
                          <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
                        </a>
                      ) : (
                        r.source
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
