import { SectionLabel } from "../SectionLabel/SectionLabel";
import { ReleaseCover } from "./ReleaseCover";
import { ARTIST_LINKS, RELEASES } from "@/config/discography";
import styles from "./Discography.module.css";

// Discography (Figma 128:673) — releases with streaming + buy links. Static from
// config; streaming falls back to the artist profiles until per-release deep
// links exist. A missing cover shows a titled placeholder, never a broken image.
export function Discography() {
  return (
    <section className={styles.section} aria-labelledby="disco-heading">
      <div className={styles.inner}>
        <SectionLabel id="disco-heading">Discography</SectionLabel>

        <ul className={styles.list}>
          {RELEASES.map((r) => {
            const links = [
              { label: "Spotify", href: r.spotify ?? ARTIST_LINKS.spotify, buy: false },
              { label: "Apple", href: r.apple ?? ARTIST_LINKS.apple, buy: false },
              { label: "Buy", href: r.buy ?? ARTIST_LINKS.buy, buy: true },
            ];
            return (
              <li key={r.title} className={styles.row}>
                <ReleaseCover
                  title={r.title}
                  art={r.art}
                  pageSlug={r.pageSlug}
                  productSlug={r.productSlug}
                />
                <div className={styles.text}>
                  <p className={styles.release}>
                    <span className={styles.year}>{r.year}</span>
                    <span className={styles.star} aria-hidden="true">
                      ★
                    </span>
                    <span className={styles.type}>{r.type}</span>
                  </p>
                  <h3 className={styles.title}>{r.title}</h3>
                </div>

                <div className={styles.links}>
                  {links.map((l, i) => (
                    <span key={l.label} className={styles.linkWrap}>
                      {i > 0 && <span className={styles.divider} aria-hidden="true" />}
                      <a
                        className={`${styles.link} ${l.buy ? styles.linkBuy : styles.linkStream}`}
                        href={l.href}
                        data-label={l.label}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.srOnly}>{r.title} on </span>
                        {l.label}
                      </a>
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
