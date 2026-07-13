/**
 * The 3-column ratio/reach/engagement stat row shared by Home's Last Post
 * block and every Stats post card (spec §Screen 1/2: number ExtraBold
 * `--pb-text-lg`, sublabel `--pb-text-2xs` muted + trend arrow). Trend
 * arrow: plain `ArrowCircleUp` = up/positive (`--pb-success`), rotated
 * 180deg = down/negative (`--pb-accent-red`) — same component/coloring on
 * both screens per spec.
 */

import { ArrowCircleUp } from "@phosphor-icons/react";
import styles from "./StatTriple.module.css";

export interface StatTripleItem {
  value: string;
  label: string;
  trend: "up" | "down";
}

export function StatTriple({ items }: { items: StatTripleItem[] }) {
  return (
    <div className={styles.row}>
      {items.map((item) => (
        <div className={styles.col} key={item.label}>
          <p className={styles.value}>{item.value}</p>
          <p className={styles.label}>
            {item.label}
            <ArrowCircleUp
              weight="fill"
              aria-hidden="true"
              className={item.trend === "up" ? styles.trendUp : styles.trendDown}
            />
          </p>
        </div>
      ))}
    </div>
  );
}
