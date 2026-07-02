import Link from "next/link";
import styles from "./Logo.module.css";

// Her name-in-pick lockup (same asset as the home hero), used as the persistent
// site mark. Always links home. Relative asset path so it resolves under any
// deploy base (studio learning #25).
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Meghan Clarisse — home">
      <img
        className={styles.img}
        src="images/hero/name-pick-lockup.svg"
        alt="Meghan Clarisse"
        width={229}
        height={192}
      />
    </Link>
  );
}
