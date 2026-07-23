/**
 * Shaped loading placeholder (specs.md §10: "Loading = shaped skeletons,
 * never spinners" — card-silhouette blocks in `--pb-card-bg` pulsing
 * 60%->100% alpha, 450ms ease cycle; reduced-motion: static 80%). Used for
 * Home's Next Post / Last Post / Weekly cards and the Stats post list
 * while their queries are in flight. Not itself a `Card` (callers place it
 * wherever a card, row, or bare block would otherwise render, matching the
 * real content's footprint).
 */

import styles from "./Skeleton.module.css";

interface SkeletonProps {
  /** CSS height value (e.g. "90px", "162px") matching the real content's
   *  footprint at this position, so nothing jumps once data arrives. */
  height: string;
  className?: string;
}

export function Skeleton({ height, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.block, className].filter(Boolean).join(" ")}
      style={{ height }}
    />
  );
}
