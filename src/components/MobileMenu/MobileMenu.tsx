"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo/Logo";
import { NAV_ITEMS, isActiveRoute } from "../Nav/navItems";
import styles from "./MobileMenu.module.css";

// Mobile primary nav: a "Menu" pill that opens a full-screen overlay of large
// links (Figma 112:191). Shown below 768; SiteChrome hides the desktop pill
// there. Escape closes, focus is trapped while open, body scroll is locked, and
// focus returns to the trigger on close.
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [open]);

  // Close on navigation and restore focus to the trigger.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Menu
      </button>

      {open && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className={styles.bar}>
            <Logo />
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Close menu"
              onClick={close}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className={styles.menuNav} aria-label="Primary">
            <ul className={styles.list}>
              {NAV_ITEMS.map(({ label, href }) => {
                const active = isActiveRoute(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={active ? `${styles.link} ${styles.active}` : styles.link}
                      onClick={() => setOpen(false)}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
