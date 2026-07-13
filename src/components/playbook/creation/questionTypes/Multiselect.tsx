"use client";

/** The one comped question type (spec §Screen 6) — the Checklist row
 *  repurposed as a selectable-option list. Enforces `question.max` by
 *  disabling further rows (quiet hint, not a blocked tap with an error). */

import { CheckSquare, Square } from "@phosphor-icons/react";
import { TapScale } from "../../motion/TapScale";
import type { QuestionTypeProps } from "./types";
import styles from "./questionTypes.module.css";

export function Multiselect({ question, value, onChange }: QuestionTypeProps) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const max = question.max;
  const atMax = typeof max === "number" && selected.length >= max;

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    if (atMax) return;
    onChange([...selected, option]);
  }

  return (
    <div>
      {question.min || question.max ? (
        <p className={styles.hint}>
          {question.min && question.max
            ? `Choose ${question.min}–${question.max}`
            : question.min
              ? `Choose at least ${question.min}`
              : `Choose up to ${question.max}`}
        </p>
      ) : null}
      <div className={styles.rowList} role="group" aria-label={question.question}>
        {(question.options ?? []).map((option) => {
          const isChecked = selected.includes(option);
          return (
            <TapScale
              key={option}
              as="button"
              className={styles.row}
              onClick={() => toggle(option)}
              disabled={!isChecked && atMax}
              ariaLabel={option}
            >
              {isChecked ? (
                <CheckSquare
                  size={32}
                  weight="fill"
                  className={styles.rowIconChecked}
                  aria-hidden="true"
                />
              ) : (
                <Square size={32} className={styles.rowIconUnchecked} aria-hidden="true" />
              )}
              <span className={styles.rowLabel}>{option}</span>
            </TapScale>
          );
        })}
      </div>
      {atMax ? (
        <p className={styles.hint}>Max {max} selected — tap one off to change.</p>
      ) : null}
    </div>
  );
}
