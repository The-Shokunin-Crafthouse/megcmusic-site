import { BIO_PARAGRAPHS } from "@/config/bio";
import { RECOGNITION } from "@/config/recognition";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./LinerNotes.module.css";

// Liner Notes (Figma 39:106): Meg's homepage bio (comp copy) with a Praise
// drop-cap and her signature pull-quote, beside a curated Recognition timeline.
export function LinerNotes() {
  const [first, ...rest] = BIO_PARAGRAPHS;
  const dropCap = first.charAt(0);
  const firstRest = first.slice(1);

  return (
    <section className={styles.section} aria-labelledby="liner-heading">
      <div className={styles.inner}>
        <SectionLabel id="liner-heading">Liner Notes</SectionLabel>

        <div className={styles.grid}>
          <div className={styles.main}>
            <p className={styles.lead}>
              <span className={styles.dropCap} aria-hidden="true">
                {dropCap}
              </span>
              <span className={styles.leadText}>
                <span className={styles.srOnly}>{dropCap}</span>
                {firstRest}
              </span>
            </p>

            <blockquote className={styles.quote}>
              <p className={styles.quoteText}>
                “Music with country roots and cowgirl boots.”
              </p>
              <cite className={styles.quoteAttr}>~ Meghan Clarisse</cite>
            </blockquote>

            {rest.map((para, i) => (
              <p key={i} className={styles.para}>
                {para}
              </p>
            ))}
          </div>

          <aside className={styles.recognition} aria-label="Recognition">
            <h3 className={styles.recHeading}>Recognition</h3>
            <ul className={styles.recList}>
              {RECOGNITION.map((r) => (
                <li key={`${r.period}-${r.title}`} className={styles.recItem}>
                  <span className={styles.recPeriod}>{r.period}</span>
                  <span className={styles.recTitle}>{r.title}</span>
                  <span className={styles.recDetail}>{r.detail}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
