import type { Metadata } from "next";
import styles from "./offline.module.css";

// The service worker's document-navigation fallback (src/app/sw.ts,
// fallbacks.entries) — served when a network request for any /megs-playbook
// document fails and nothing cached matches. Plumbing, not a screen: a
// quiet, functional "you're offline" state, not a designed empty state.
export const metadata: Metadata = {
  title: "Offline — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <p className={styles.title}>You&apos;re offline</p>
        <p className={styles.body}>
          The playbook needs a connection to load this. Reconnect and try
          again — anything you were drafting is saved on this device.
        </p>
      </div>
    </div>
  );
}
