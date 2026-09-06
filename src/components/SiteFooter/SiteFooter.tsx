import Link from "next/link";
import { FacebookLogo } from "@phosphor-icons/react/dist/ssr/FacebookLogo";
import { InstagramLogo } from "@phosphor-icons/react/dist/ssr/InstagramLogo";
import { YoutubeLogo } from "@phosphor-icons/react/dist/ssr/YoutubeLogo";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { WP_ORIGIN } from "@/lib/wp-origin";
import { HOME_CONTENT } from "@/lib/home-content";
import styles from "./SiteFooter.module.css";

// Footer (Figma 39:286) — oversized "BOOK ME" watermark behind the connect
// icons + booking CTA and copyright. The gig CTA points at Meg's live contact
// page until the native /booking route ships (Phase 3), then it repoints.
const BOOKING_HREF = `${WP_ORIGIN}/contact-me/`;

// Connect row (from her WP Connect page). The Envelope points at /booking rather
// than her personal address, so her email stays off a public repo — the booking
// form reaches her the same way.
const SOCIALS = [
  { label: "Meghan on Facebook", href: HOME_CONTENT.facebookUrl, Icon: FacebookLogo, external: true },
  { label: "Meghan on Instagram", href: HOME_CONTENT.instagramUrl, Icon: InstagramLogo, external: true },
  { label: "Meghan on YouTube", href: HOME_CONTENT.youtubeUrl, Icon: YoutubeLogo, external: true },
  { label: "Email Meghan", href: "/booking", Icon: EnvelopeSimple, external: false },
] as const;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.watermark} aria-hidden="true">
        BOOK ME
      </p>
      <div className={styles.inner}>
        <div className={styles.actions}>
          <ul className={styles.socials}>
            {SOCIALS.map(({ label, href, Icon, external }) => (
              <li key={label} className={styles.socialItem}>
                {external ? (
                  <a
                    className={styles.social}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={22} weight="fill" aria-hidden="true" />
                  </a>
                ) : (
                  <Link className={styles.social} href={href} aria-label={label}>
                    <Icon size={22} weight="fill" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <Link className={styles.cta} href={BOOKING_HREF}>
            Request A Gig
          </Link>
        </div>
        <p className={styles.copyright}>Copyright © 2026 Meghan Clarisse</p>
      </div>
    </footer>
  );
}
