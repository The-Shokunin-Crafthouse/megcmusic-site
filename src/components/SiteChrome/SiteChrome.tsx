import { Logo } from "../Logo/Logo";
import { Nav } from "../Nav/Nav";
import { MobileMenu } from "../MobileMenu/MobileMenu";
import styles from "./SiteChrome.module.css";

// Persistent site chrome on every route (root layout). An absolute overlay so
// full-bleed pages paint behind it. Logo left; on desktop the nav pill sits
// right, on mobile a Menu button opens the full-screen menu.
export function SiteChrome() {
  return (
    <div className={styles.chrome}>
      <Logo />
      <div className={styles.desktopNav}>
        <Nav />
      </div>
      <div className={styles.mobileNav}>
        <MobileMenu />
      </div>
    </div>
  );
}
