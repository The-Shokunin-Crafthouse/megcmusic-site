import type { Metadata, Viewport } from "next";
import { PlaybookProviders } from "@/components/playbook/PlaybookProviders";
import { PB_BG_HEX } from "./pwa-constants";
import styles from "./pwa-layout.module.css";

// PWA shell layout for /megs-playbook (Sprint 10 P3). Wraps every route
// under this segment — the existing page.tsx today, P4's real shell
// tomorrow — with: install metadata (manifest, Apple PWA meta), the
// safe-area-aware base-surface backdrop, and the TanStack Query + SW
// registration boundary. Global SiteChrome is suppressed separately, at
// the root layout, via ChromeGate.
//
// robots: noindex is intentionally duplicated from page.tsx's own
// metadata (not removed there — page.tsx stays untouched per the sprint
// contract) so the route stays unindexed even if a future page under this
// segment forgets to set it itself.
//
// manifest: served as a static file (public/megs-playbook/manifest.webmanifest),
// not the App Router `manifest.ts` convention — that convention only
// resolves at the app root; a nested `src/app/megs-playbook/manifest.ts`
// silently produced no route in this Next version (confirmed against the
// build output). Same URL either way, so nothing downstream cares.
export const metadata: Metadata = {
  manifest: "/megs-playbook/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Playbook",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  themeColor: PB_BG_HEX, // --pb-bg (_config/design-system/token-map.css)
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function MegsPlaybookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlaybookProviders>
      <div className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true">
          <div className={styles.backdropImage} />
          <div className={styles.backdropScrim} />
        </div>
        <div className={styles.column}>{children}</div>
      </div>
    </PlaybookProviders>
  );
}
