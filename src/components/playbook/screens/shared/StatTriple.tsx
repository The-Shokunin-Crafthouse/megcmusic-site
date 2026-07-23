/**
 * The 3-column ratio/reach/engagement stat row shared by Home's Last Post
 * block and every Stats post card (spec §Screen 1/2: number ExtraBold
 * `--pb-text-lg`, sublabel `--pb-text-2xs` muted + trend arrow). Trend
 * arrow: `ArrowCircleUp` at regular weight (the comp's exported glyph is
 * the outline, not the filled disc) = up/positive (`--pb-trend-up`),
 * rotated 180deg = down/negative (`--pb-trend-down`) — same component and
 * coloring on both screens per spec.
 */

import { ArrowCircleUp } from "@phosphor-icons/react";
import styles from "./StatTriple.module.css";

export interface StatTripleItem {
  value: string;
  label: string;
  trend: "up" | "down";
}

interface StatTripleProps {
  items: StatTripleItem[];
  /** Home's Last Post row (155:91) spaces avatar + columns 8px apart; the
   *  Stats post card (155:526) butts them together at 0. */
  gap?: "none" | "tight";
}

export function StatTriple({ items, gap = "none" }: StatTripleProps) {
  return (
    <div className={gap === "tight" ? `${styles.row} ${styles.gapTight}` : styles.row}>
      {items.map((item) => (
        <div className={styles.col} key={item.label}>
          <p className={styles.value}>{item.value}</p>
          <p className={styles.label}>
            {item.label}
            <ArrowCircleUp
              weight="regular"
              aria-hidden="true"
              className={item.trend === "up" ? styles.trendUp : styles.trendDown}
            />
          </p>
        </div>
      ))}
    </div>
  );
}
