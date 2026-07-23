"use client";

/**
 * Filter-chip / tab-nav pill row — one component reused across Stats
 * (All Time/Last Week/Reach/Engagement/Score), and, per the sprint brief,
 * intended for Booking and Checklist's own chip sets later (built generic
 * on purpose: `chips` is an opaque id/label list, not Stats-specific).
 * Spec §Screen 2 Components: active chip = solid `--pb-teal` fill pill,
 * `--pb-teal-ink` text; inactive = plain `--pb-text-muted` text, no chip
 * background; container = `--pb-card-bg` pill, `--pb-radius-chip-row`.
 * Horizontal-scrolls if the chip set overflows the 342px row.
 */

import { CaretDown } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { tapScaleSpring } from "../../motion/springs";
import styles from "./ChipRow.module.css";

export interface Chip {
  id: string;
  label: string;
  /** Renders a trailing `CaretDown` glyph (Booking's "Category" picker
   *  chip — spec §Screen 3 Components). */
  caretIcon?: boolean;
}

interface ChipRowProps {
  chips: Chip[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

export function ChipRow({ chips, activeId, onChange, ariaLabel }: ChipRowProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.row} role="group" aria-label={ariaLabel}>
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <motion.button
            key={chip.id}
            type="button"
            className={active ? `${styles.chip} ${styles.active}` : styles.chip}
            aria-pressed={active}
            onClick={() => onChange(chip.id)}
            whileTap={reducedMotion ? undefined : { scale: 0.92 }}
            transition={tapScaleSpring}
          >
            {chip.label}
            {chip.caretIcon ? (
              <CaretDown className={styles.caret} aria-hidden="true" />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}
