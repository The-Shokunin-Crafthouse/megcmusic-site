import { SectionLabel } from "../SectionLabel/SectionLabel";
import { getEpkContent } from "@/lib/epk-content";
import styles from "./EPK.module.css";
import { heroImage } from "@/lib/hero-images";
import { epkThumb } from "@/lib/epk-thumbs";

// Electronic Press Kit (Figma 39:158) — rows of downloadable kits. The rows are
// the same ACF repeater the /epk page reads, so Meg edits them in one place; a
// row with neither a file nor a link shows a "coming soon" state instead of a
// dead button, so the section is always intentional. Each row's picture is the
// first page of its download, drawn at build (ADR 2026-09-23); a row with no
// file to draw keeps the site photo.
export async function EPK() {
  const { kitItems } = await getEpkContent();

  return (
    <section className={styles.section} aria-labelledby="epk-heading">
      <div className={styles.inner}>
        <SectionLabel id="epk-heading">Electronic Press Kit</SectionLabel>

        <ul className={styles.list}>
          {kitItems.map((item) => {
            const thumb = epkThumb(item.href);
            return (
              <li key={item.title} className={styles.row}>
                <div className={styles.meta}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.thumb}
                    src={thumb?.src ?? heroImage("home")}
                    srcSet={thumb?.srcSet}
                    // The frame is 84px wide on phones and 112px from 768px (EPK.module.css).
                    sizes={thumb ? "(min-width: 768px) 112px, 84px" : undefined}
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
            );
          })}
        </ul>
      </div>
    </section>
  );
}
