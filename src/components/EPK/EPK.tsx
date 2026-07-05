import { SectionLabel } from "../SectionLabel/SectionLabel";
import { EPK_ITEMS } from "@/config/epk";
import styles from "./EPK.module.css";

// Electronic Press Kit (Figma 39:158) — rows of downloadable kits. Static from
// config; a row with no href yet shows a "coming soon" state instead of a dead
// button, so the section is always intentional.
export function EPK() {
  return (
    <section className={styles.section} aria-labelledby="epk-heading">
      <div className={styles.inner}>
        <SectionLabel id="epk-heading">Electronic Press Kit</SectionLabel>

        <ul className={styles.list}>
          {EPK_ITEMS.map((item) => (
            <li key={item.title} className={styles.row}>
              <div className={styles.meta}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.thumb}
                  src="images/hero/meghan-hero.jpg"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
                <div className={styles.text}>
                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.desc}>{item.description}</p>
                </div>
              </div>

              {item.href ? (
                <a
                  className={styles.action}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.action}
                </a>
              ) : (
                <span className={styles.soon} aria-disabled="true">
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
