import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { PullQuote } from "@/components/PullQuote/PullQuote";
import { RELEASES_WITH_PRESS, getReleaseDetail, getPressPages } from "@/lib/releases-content";
import { heroImage } from "@/lib/hero-images";
import styles from "./reviews.module.css";

/**
 * A release's reviews page (2026-09-17) — Meg's own WordPress review pages
 * ("Reviews: Shadows of a Ghost Town", "Kindred Spirits Review"), absorbed
 * from the old theme. Which pages appear is decided by the links on the
 * release's "What people are saying" rows: a row that links to one of her
 * pages pulls that page's body in here at build, and the row's link comes
 * here instead. Rendered as typed blocks (src/lib/press-page.ts), never raw
 * HTML. Every link on the page is an outlet, so it opens in a new tab and
 * says so.
 */
export function generateStaticParams() {
  return RELEASES_WITH_PRESS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const release = getReleaseDetail(slug);
  if (!release) return { title: "Reviews — MegCMusic" };
  return {
    title: `Reviews — ${release.title} — Meghan Clarisse`,
    description: `Press and reviews for ${release.title} (${release.year}) by Meghan Clarisse Cave.`,
  };
}

export default async function ReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = getReleaseDetail(slug);
  const pages = getPressPages(slug);
  if (!release || pages.length === 0) notFound();

  return (
    <div className={styles.page}>
      <img className={styles.bg} src={heroImage(`release-${release.wpSlug}`)} alt="" aria-hidden="true" decoding="async" />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link className={styles.back} href={`/music/${slug}`}>
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              {release.title}
            </Link>
            <p className={styles.stars} aria-hidden="true">
              ★★★
            </p>
            <h1 className={styles.title}>Reviews</h1>
            <p className={styles.lede}>What people are saying about {release.title}.</p>
          </div>
        </header>

        {pages.map((page) => (
          <section key={page.slug} className={styles.section} aria-labelledby={`press-${page.slug}`}>
            <div className={styles.inner}>
              <SectionLabel id={`press-${page.slug}`}>{page.title}</SectionLabel>
              <div className={styles.prose}>
                {page.blocks.map((block, i) => {
                  if (block.type === "quote") {
                    return <PullQuote key={i} quote={block.text} attribution={block.attribution || undefined} />;
                  }
                  if (block.type === "image") {
                    return (
                      <figure key={i} className={styles.figure}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.img} src={block.src} alt={block.alt} loading="lazy" decoding="async" />
                      </figure>
                    );
                  }
                  return (
                    <p key={i} className={styles.para}>
                      {block.runs.map((run, k) =>
                        run.href ? (
                          <a key={k} className={styles.link} href={run.href} target="_blank" rel="noopener noreferrer">
                            {run.text}
                            <span className={styles.srOnly}> (opens in a new tab)</span>
                            <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
                          </a>
                        ) : (
                          <span key={k}>{run.text}</span>
                        ),
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
