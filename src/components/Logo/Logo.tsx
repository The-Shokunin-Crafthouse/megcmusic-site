import Link from "next/link";
import styles from "./Logo.module.css";

// Persistent site mark: the guitar-pick and the "Meghan Clarisse" name are two
// separate crisp SVGs (split from the Figma 39:4 export) layered in the same
// 272.94² space, so the name can carry its own left-to-right gradient shimmer.
// Links home. Relative asset paths resolve under any deploy base (learning #25).
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Meghan Clarisse — home">
      <span className={styles.lockup}>
        <img
          className={styles.pick}
          src="/images/hero/logo-pick.svg"
          alt=""
          aria-hidden="true"
          width={273}
          height={273}
        />
        <img
          className={styles.name}
          src="/images/hero/logo-name.svg"
          alt="Meghan Clarisse"
          width={273}
          height={273}
        />
        <span className={styles.shimmer} aria-hidden="true" />
      </span>
    </Link>
  );
}
