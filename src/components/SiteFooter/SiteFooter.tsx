import Link from "next/link";
import { WP_ORIGIN } from "@/lib/wp-origin";
import styles from "./SiteFooter.module.css";

// Footer (Figma 39:286) — oversized "BOOK ME" watermark behind the booking CTA
// and copyright. The gig CTA points at Meg's live contact page until the native
// /booking route ships (Phase 3), then it repoints.
const BOOKING_HREF = `${WP_ORIGIN}/contact-me/`;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.watermark} aria-hidden="true">
        BOOK ME
      </p>
      <div className={styles.inner}>
        <Link className={styles.cta} href={BOOKING_HREF}>
          Request A Gig
        </Link>
        <p className={styles.copyright}>Copyright © 2026 Meghan Clarisse</p>
      </div>
    </footer>
  );
}
