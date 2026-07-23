"use client";

/** `yes_no` (specs.md §9.11): two full-width 70px rows, checklist-row
 *  chrome; selecting auto-advances like `single`. */

import { TapScale } from "../../motion/TapScale";
import type { QuestionTypeProps } from "./types";
import styles from "./questionTypes.module.css";

export function YesNo({ value, onChange, onAutoAdvance }: QuestionTypeProps) {
  const selected = typeof value === "boolean" ? value : null;

  function handleSelect(next: boolean) {
    onChange(next);
    window.setTimeout(() => onAutoAdvance?.(), 220);
  }

  return (
    <div className={styles.yesNoList}>
      <TapScale
        as="button"
        className={`${styles.yesNoRow} ${selected === true ? styles.yesNoRowSelected : ""}`}
        onClick={() => handleSelect(true)}
        ariaLabel="Yes"
      >
        Yes
      </TapScale>
      <TapScale
        as="button"
        className={`${styles.yesNoRow} ${selected === false ? styles.yesNoRowSelected : ""}`}
        onClick={() => handleSelect(false)}
        ariaLabel="No"
      >
        No
      </TapScale>
    </div>
  );
}
