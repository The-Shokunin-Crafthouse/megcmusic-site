import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { SINGLES } from "@/lib/releases-content";
import styles from "./Singles.module.css";

/**
 * Standalone singles, newest first — the releases the Discography leaves out.
 * Shown on Home and on Music, so a single is not stranded on one page the way
 * "Everything You Are To Me" was after the registry split (decisions.md
 * 2026-09-06).
 *
 * A single links to its detail page when Meg has pointed its registry row at a
 * WordPress page, and renders as a plain row when she has not — a listing, not
 * a dead link. Section absent by content: no singles, no heading.
 */
export function Singles({
  id = "singles-heading",
  surface = "home",
}: {
  id?: string;
  /** Which page's section rhythm to wear — see Singles.module.css. */
  surface?: "home" | "page";
}) {
  if (SINGLES.length === 0) return null;
  const section = surface === "home" ? styles.sectionHome : styles.sectionPage;
  const inner = surface === "home" ? styles.innerHome : styles.innerPage;

  return (
    <section className={section} aria-labelledby={id}>
      <div className={inner}>
        <SectionLabel id={id}>Singles</SectionLabel>
        <ul className={styles.singles}>
          {SINGLES.map((single) => {
            const meta = (
              <>
                <span className={styles.singleMeta}>
                  <span className={styles.singleYear}>{single.year}</span>
                  <span className={styles.singleStar} aria-hidden="true">
                    ★
                  </span>
                  <span className={styles.singleType}>{single.type}</span>
                </span>
                <span className={styles.singleTitle}>{single.title}</span>
              </>
            );
            return (
              <li key={single.title} className={styles.single}>
                {single.detailSlug ? (
                  <Link
                    className={styles.singleLink}
                    href={`/music/${single.detailSlug}`}
                  >
                    {meta}
                    <ArrowUpRight
                      className={styles.singleArrow}
                      size={18}
                      weight="bold"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <span className={styles.singleStatic}>{meta}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
