"use client";

/**
 * Reduced-motion-safe expand/collapse primitive. The trigger is a native
 * <button> (Enter/Space work for free); the region animates via a
 * grid-template-rows 0fr→1fr transition — no JS height measurement, no
 * layout thrash. Reduced motion drops the transition entirely (instant
 * toggle), never leaving content blank mid-animation.
 */

import { useId, useState } from "react";
import styles from "./Disclosure.module.css";

export function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.chevron} data-open={open} aria-hidden="true" />
        {label}
      </button>
      <div
        id={regionId}
        role="region"
        aria-label={label}
        className={styles.region}
        data-open={open}
      >
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
}
