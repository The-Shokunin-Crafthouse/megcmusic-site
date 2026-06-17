import styles from "./Hero.module.css";

// Guitar-pick silhouette — hand-authored so the fill is tokenizable via
// currentColor and carries no Figma frame-export artifacts (see
// decisions/decisions.md 2026-06-16, Sprint-2 asset strategy).
const PICK_PATH =
  "M50 4C72 4 94 13 94 36C94 60 70 96 56 110C52.7 113.2 47.3 113.2 44 110C30 96 6 60 6 36C6 13 28 4 50 4Z";

export function Hero() {
  return (
    <section className={styles.hero}>
      <img
        className={styles.photo}
        src="images/hero/hero.jpg"
        alt="Meghan Clarisse Cave performing live"
        width={1500}
        height={2000}
        fetchPriority="high"
        decoding="async"
      />

      <svg
        className={styles.pick}
        viewBox="0 0 100 116"
        aria-hidden="true"
        focusable="false"
      >
        <path d={PICK_PATH} fill="currentColor" />
      </svg>

      <h1 className={styles.heading}>
        <img
          className={styles.lockup}
          src="images/hero/name-lockup.svg"
          alt="Meghan Clarisse"
          width={210}
          height={114}
        />
      </h1>
    </section>
  );
}
