import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <img
        className={styles.photo}
        src="images/hero/meghan-hero.jpg"
        alt="Meghan Clarisse Cave performing live"
        width={2849}
        height={1632}
        fetchPriority="high"
        decoding="async"
      />

      {/* Pick + name lockup are one exported SVG (Figma 39:4) so the lettering
          stays locked inside the pick at every size. The heading carries the
          page's accessible name. */}
      <h1 className={styles.heading}>
        <img
          className={styles.lockup}
          src="images/hero/name-pick-lockup.svg"
          alt="Meghan Clarisse"
          width={229}
          height={192}
        />
      </h1>
    </section>
  );
}
