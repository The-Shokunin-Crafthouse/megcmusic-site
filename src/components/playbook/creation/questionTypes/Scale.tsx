"use client";

/** `scale` (specs.md §9.11): five 56px circles, numerals 1-5. Pole labels
 *  parse from the question text after "from 1 (" / "to 5 (" — omitted
 *  when absent, never fabricated. Does not auto-advance (not listed as
 *  auto-advancing in specs.md §9.11, unlike `single`/`yes_no`). */

import { TapScale } from "../../motion/TapScale";
import type { QuestionTypeProps } from "./types";
import styles from "./questionTypes.module.css";

function parsePoleLabel(questionText: string, bound: number, direction: "from" | "to") {
  const pattern = new RegExp(`${direction}\\s*${bound}\\s*\\(([^)]*)\\)`, "i");
  const match = questionText.match(pattern);
  const label = match?.[1]?.trim();
  return label && label.length > 0 ? label : null;
}

export function Scale({ question, value, onChange }: QuestionTypeProps) {
  const min = question.min ?? 1;
  const max = question.max ?? 5;
  const selected = typeof value === "number" ? value : null;
  const lowLabel = parsePoleLabel(question.question, min, "from");
  const highLabel = parsePoleLabel(question.question, max, "to");
  const numerals = Array.from({ length: Math.max(max - min + 1, 0) }, (_, index) => min + index);

  return (
    <div>
      <div className={styles.scaleRow} role="group" aria-label={question.question}>
        {numerals.map((numeral) => {
          const pole =
            numeral === min && lowLabel
              ? ` — ${lowLabel}`
              : numeral === max && highLabel
                ? ` — ${highLabel}`
                : "";
          return (
            <TapScale
              key={numeral}
              as="button"
              className={`${styles.scaleCircle} ${
                selected === numeral ? styles.scaleCircleSelected : ""
              }`}
              onClick={() => onChange(numeral)}
              ariaLabel={`${numeral}${pole}`}
            >
              {numeral}
            </TapScale>
          );
        })}
      </div>
      {lowLabel || highLabel ? (
        <div className={styles.scalePoles} aria-hidden="true">
          <span>{lowLabel ?? ""}</span>
          <span>{highLabel ?? ""}</span>
        </div>
      ) : null}
    </div>
  );
}
