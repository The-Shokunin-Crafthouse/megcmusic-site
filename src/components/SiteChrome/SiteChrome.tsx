import { Logo } from "../Logo/Logo";
import { Nav } from "../Nav/Nav";
import styles from "./SiteChrome.module.css";

// Persistent site chrome: the logo (links home) and the primary nav, present on
// every route via the root layout. An absolute overlay so full-bleed pages
// (home hero, /shows photo) still paint edge-to-edge behind it. Stacks on
// mobile (logo over the full-width nav pill), splits left/right on desktop.
export function SiteChrome() {
  return (
    <div className={styles.chrome}>
      <Logo />
      <Nav />
    </div>
  );
}
