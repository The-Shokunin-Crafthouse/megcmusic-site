import Link from "next/link";
import styles from "./Nav.module.css";

type NavItem = { label: string; href: string };

const ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shows", href: "/shows" },
  { label: "Media", href: "/media" },
  { label: "Booking", href: "/booking" },
  { label: "Shop", href: "/shop" },
];

// Sprint 2 ships a static active route (Home). Routes other than "/" are not
// built yet; prefetch is off until they exist. Dynamic active state arrives
// with routing in a later sprint.
const ACTIVE_HREF = "/";

export function Nav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {ITEMS.map(({ label, href }) => {
          const active = href === ACTIVE_HREF;
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={active ? `${styles.link} ${styles.active}` : styles.link}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
