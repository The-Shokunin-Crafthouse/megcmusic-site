/**
 * ★ row divider — the brand motif used to bracket Home's Last Post block
 * (spec `155:80`/`84`, Lora Bold 6px) and as empty-state punctuation
 * (specs.md §10). Purely decorative — `aria-hidden`, no semantic content.
 */

import styles from "./StarDivider.module.css";

const STAR_COUNT = 37;
const STARS = "★".repeat(STAR_COUNT);

export function StarDivider({ className }: { className?: string }) {
  return (
    <p aria-hidden="true" className={[styles.row, className].filter(Boolean).join(" ")}>
      {STARS}
    </p>
  );
}
