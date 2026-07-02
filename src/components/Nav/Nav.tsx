"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

type NavItem = { label: string; href: string };

const ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shows", href: "/shows" },
  { label: "Media", href: "/media" },
  { label: "Booking", href: "/booking" },
  { label: "Shop", href: "/shop" },
];

// The nav's first route-aware sprint: /shows is the first built route beyond "/".
// Home matches only exactly; every other route also matches its sub-paths so a
// future /shows/<slug> keeps the tab lit. Prefetch stays off until the remaining
// routes (Media / Booking / Shop) exist.
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {ITEMS.map(({ label, href }) => {
          const active = isActive(pathname, href);
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
