"use client";

/** `text_short` / `text_long` (specs.md §9.11): the idea-entry "paper"
 *  card verbatim, at two heights — 96px and 200px. Real `<textarea>`s,
 *  same as the idea screen. */

import shared from "../creation.module.css";
import type { QuestionTypeProps } from "./types";
import styles from "./questionTypes.module.css";

const PLACEHOLDER = "Type your answer…";

export function TextShort({ question, value, onChange }: QuestionTypeProps) {
  return (
    <textarea
      className={`${shared.paperCard} ${styles.paperCardShort}`}
      placeholder={PLACEHOLDER}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      aria-label={question.question}
    />
  );
}

export function TextLong({ question, value, onChange }: QuestionTypeProps) {
  return (
    <textarea
      className={shared.paperCard}
      placeholder={PLACEHOLDER}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      aria-label={question.question}
    />
  );
}
