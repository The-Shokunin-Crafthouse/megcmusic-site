import type { ReactNode } from "react";
import styles from "./SectionLabel.module.css";

// The brand section header — ★★★ LABEL ★★★ (Figma 39:2). The stars are
// decorative; the label text carries the heading. Renders as the given level.
export function SectionLabel({
  children,
  as: Tag = "h2",
  id,
}: {
  children: ReactNode;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <Tag className={styles.heading} id={id}>
      <span className={styles.stars} aria-hidden="true">
        ★★★
      </span>
      <span className={styles.label}>{children}</span>
      <span className={styles.stars} aria-hidden="true">
        ★★★
      </span>
    </Tag>
  );
}
