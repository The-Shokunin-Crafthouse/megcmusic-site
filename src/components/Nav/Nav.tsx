"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActiveRoute } from "./navItems";
import styles from "./Nav.module.css";

// Desktop primary nav — the floating pink pill. Hidden below 768, where
// SiteChrome shows the Menu button instead.
export function Nav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ label, href }) => {
          const active = isActiveRoute(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={active ? `${styles.link} ${styles.active}` : styles.link}
              >
                {/* Each letter rolls up on its own, staggered left-to-right; a
                    teal copy rolls in behind it. Labels are single words, so the
                    split reads fine to a screen reader (Link carries aria-label). */}
                <span className={styles.roll} aria-hidden="true">
                  {label.split("").map((ch, i) => (
                    <span
                      key={i}
                      className={styles.rollChar}
                      style={{ "--i": i } as CSSProperties}
                    >
                      <span className={styles.rollInner} data-ch={ch}>
                        {ch}
                      </span>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
