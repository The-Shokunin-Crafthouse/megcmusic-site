/**
 * The Daily Insight-shaped tip card (spec §Screen 1 Components): icon
 * (`ArrowCircleUp` rotated 180deg, reads as a refresh glyph here — distinct
 * from its trend-indicator use in StatTriple) + teal SemiBold 12px label
 * row, then cream 14px body.
 *
 * Async states follow specs.md §10's "Tips (any card)" row exactly:
 * loading -> pulsing skeleton line; a real tip -> its body; no active tip
 * for the surface (query resolved to `null`) -> `fallback`, never a blank
 * card; a fetch **error** -> render nothing at all ("hide the tip line — a
 * missing nicety, not an error state", per spec — distinct from the empty
 * case, which must still show the fallback line).
 */

import { ArrowCircleUp } from "@phosphor-icons/react";
import { Card } from "./Card";
import styles from "./TipCard.module.css";

interface TipCardProps {
  label: string;
  body: string | null | undefined;
  isLoading: boolean;
  isError: boolean;
  fallback: string;
  className?: string;
}

export function TipCard({
  label,
  body,
  isLoading,
  isError,
  fallback,
  className,
}: TipCardProps) {
  if (isError) return null;

  return (
    <Card className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <ArrowCircleUp className={styles.icon} weight="regular" aria-hidden="true" />
        <span className={styles.label}>{label}</span>
      </div>
      {isLoading ? (
        <div className={styles.skeletonLine} aria-hidden="true" />
      ) : (
        <p className={styles.body}>{body ?? fallback}</p>
      )}
    </Card>
  );
}
