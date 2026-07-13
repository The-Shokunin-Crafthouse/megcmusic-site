import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { POETRY } from "@/config/poetry";
import { PoetryCover } from "./PoetryCover";
import styles from "./poetry.module.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Secrets From a Songbird — Poetry by Meghan Clarisse",
  description:
    "Secrets From a Songbird — a collection of original poetry by Meghan Clarisse Cave, written in her late teens and early twenties and never before shared.",
};

export default function PoetryPage() {
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
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.coverWrap}>
              <PoetryCover productSlug={POETRY.productSlug} />
            </div>

            <div className={styles.heroText}>
              <p className={styles.eyebrow} aria-hidden="true">
                ★★★ Poetry
              </p>
              <h1 className={styles.title}>{POETRY.title}</h1>
              <p className={styles.subtitle}>{POETRY.subtitle}</p>
              <p className={styles.lede}>{POETRY.lede}</p>

              <div className={styles.actions}>
                <Link className={styles.buy} href={POETRY.buyHref}>
                  Buy the book
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </Link>
                <span className={styles.note}>{POETRY.note}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="poetry-about">
          <div className={styles.inner}>
            <SectionLabel id="poetry-about">Inside the Pages</SectionLabel>
            <div className={styles.prose}>
              {POETRY.paragraphs.map((para, i) => (
                <p key={i} className={styles.para}>
                  {para}
                </p>
              ))}
            </div>

            <Link className={styles.buyGhost} href={POETRY.buyHref}>
              Buy the book
              <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
