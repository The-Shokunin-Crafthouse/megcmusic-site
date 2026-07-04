"use client";

import { useEffect, useState } from "react";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import { paragraphsFromHtml } from "@/lib/wp-content";
import { RECOGNITION } from "@/config/recognition";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./LinerNotes.module.css";

// Liner Notes (Figma 39:106): Meg's bio from her WP /about page (she keeps
// editing it there) with a Praise drop-cap and her signature pull-quote, beside
// a curated Recognition timeline. Server-rendered when the host is reachable;
// otherwise the browser refetches from the visitor's residential IP (the WP
// host blocks datacenter IPs — see events-browser.ts).
export function LinerNotes({ paragraphs }: { paragraphs: string[] }) {
  const [bio, setBio] = useState<string[]>(paragraphs);

  useEffect(() => {
    if (paragraphs.length > 0) return;
    let alive = true;
    (async () => {
      const html = await fetchPageContentBrowser("about");
      if (alive) setBio(paragraphsFromHtml(html));
    })();
    return () => {
      alive = false;
    };
  }, [paragraphs]);

  const [first, ...rest] = bio;
  const dropCap = first?.charAt(0) ?? "";
  const firstRest = first?.slice(1) ?? "";

  return (
    <section className={styles.section} aria-labelledby="liner-heading">
      <div className={styles.inner}>
        <SectionLabel id="liner-heading">Liner Notes</SectionLabel>

        <div className={styles.grid}>
          <div className={styles.main}>
            {first && (
              <p className={styles.lead}>
                <span className={styles.dropCap} aria-hidden="true">
                  {dropCap}
                </span>
                <span className={styles.leadText}>
                  <span className={styles.srOnly}>{dropCap}</span>
                  {firstRest}
                </span>
              </p>
            )}

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
