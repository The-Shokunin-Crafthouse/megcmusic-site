import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { POETRY } from "@/config/poetry";
import { POETRY_CONTENT } from "@/lib/poetry-content";
import { PoetryCover } from "./PoetryCover";
import styles from "./poetry.module.css";
import { heroImage } from "@/lib/hero-images";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: POETRY_CONTENT.metaTitle,
  description: POETRY_CONTENT.metaDescription,
};

export default function PoetryPage() {
  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src={heroImage("poetry")}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.coverWrap}>
              <PoetryCover productSlug={POETRY.productSlug} />
            </div>

            <div className={styles.heroText}>
              <p className={styles.eyebrow} aria-hidden="true">
                ★★★ Poetry
              </p>
              <h1 className={styles.title}>{POETRY_CONTENT.title}</h1>
              <p className={styles.subtitle}>{POETRY_CONTENT.subtitle}</p>
              <p className={styles.lede}>{POETRY_CONTENT.lede}</p>

              <div className={styles.actions}>
                <Link className={styles.buy} href={POETRY_CONTENT.buyHref}>
                  Buy the book
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </Link>
                <span className={styles.note}>{POETRY_CONTENT.note}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="poetry-about">
          <div className={styles.inner}>
            <SectionLabel id="poetry-about">Inside the Pages</SectionLabel>
            <div className={styles.prose}>
              {POETRY_CONTENT.paragraphs.map((para, i) => (
                <p key={i} className={styles.para}>
                  {para}
                </p>
              ))}
            </div>

            <Link className={styles.buyGhost} href={POETRY_CONTENT.buyHref}>
              Buy the book
              <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
