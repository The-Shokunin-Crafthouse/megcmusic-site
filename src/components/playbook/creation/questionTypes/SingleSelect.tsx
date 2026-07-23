"use client";

/** `single` (specs.md §9.11): the multiselect row list with radio
 *  affordance (Circle/CheckCircle) instead of check-square; selecting
 *  auto-advances 220ms later — a single answer *is* the answer. */

import { CheckCircle, Circle } from "@phosphor-icons/react";
import { TapScale } from "../../motion/TapScale";
import type { QuestionTypeProps } from "./types";
import styles from "./questionTypes.module.css";

export function SingleSelect({ question, value, onChange, onAutoAdvance }: QuestionTypeProps) {
  const selected = typeof value === "string" ? value : null;

  function handleSelect(option: string) {
    onChange(option);
    window.setTimeout(() => onAutoAdvance?.(), 220);
  }

  return (
    <div className={styles.rowList} role="group" aria-label={question.question}>
      {(question.options ?? []).map((option) => {
        const isSelected = selected === option;
        return (
          <TapScale
            key={option}
            as="button"
            className={styles.row}
            onClick={() => handleSelect(option)}
            ariaLabel={option}
          >
            {isSelected ? (
              <CheckCircle
                size={32}
                weight="fill"
                className={styles.rowIconChecked}
                aria-hidden="true"
              />
            ) : (
              <Circle size={32} className={styles.rowIconUnchecked} aria-hidden="true" />
            )}
            <span className={styles.rowLabel}>{option}</span>
          </TapScale>
        );
      })}
    </div>
  );
}
