import { SectionLabel } from "../SectionLabel/SectionLabel";
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
              { label: "Spotify", href: r.spotify ?? ARTIST_LINKS.spotify },
              { label: "Apple", href: r.apple ?? ARTIST_LINKS.apple },
              { label: "Buy", href: r.buy ?? ARTIST_LINKS.buy },
            ];
            return (
              <li key={r.title} className={styles.row}>
                <div className={styles.meta}>
                  {r.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.art}
                      src={r.art}
                      alt={`${r.title} cover art`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className={styles.artPlaceholder} aria-hidden="true">
                      <span className={styles.artStar}>★</span>
                      <span className={styles.artTitle}>{r.title}</span>
                    </span>
                  )}
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
                </div>

                <div className={styles.links}>
                  {links.map((l, i) => (
                    <span key={l.label} className={styles.linkWrap}>
                      {i > 0 && <span className={styles.divider} aria-hidden="true" />}
                      <a
                        className={styles.link}
                        href={l.href}
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
