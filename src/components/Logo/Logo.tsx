import Link from "next/link";
import styles from "./Logo.module.css";

// Persistent site mark: the guitar-pick and the "Meghan Clarisse" name are two
// separate crisp SVGs layered in the same 229×192 space, so the name can carry
// its own left-to-right gradient shimmer. Links home. Relative asset paths
// resolve under any deploy base (studio learning #25).
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Meghan Clarisse — home">
      <span className={styles.lockup}>
        <img
          className={styles.pick}
          src="images/hero/logo-pick.svg"
          alt=""
          aria-hidden="true"
          width={229}
          height={192}
        />
        <img
          className={styles.name}
          src="images/hero/logo-name.svg"
          alt="Meghan Clarisse"
          width={229}
          height={192}
        />
        <span className={styles.shimmer} aria-hidden="true" />
      </span>
    </Link>
  );
}
