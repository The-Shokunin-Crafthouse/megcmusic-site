import type { Question } from "@/lib/playbook/generation";

/** Shared prop contract every question-type component renders from — the
 *  engine (`QuestionPage.tsx`) never branches on `question.type` itself
 *  beyond picking which of these to mount (`./index.ts`'s registry). */
export interface QuestionTypeProps {
  question: Question;
  /** string[] (multiselect) / string (single, text_short, text_long) /
   *  boolean (yes_no) / number (scale) — loose on purpose, same looseness
   *  as the store's `answers` slice and the server's `answersSchema`. */
  value: unknown;
  onChange: (value: unknown) => void;
  /** `single` and `yes_no` call this ~220ms after a selection is made
   *  (auto-advance, per specs.md §9.11); other types ignore it and rely on
   *  QuestionPage's own Next button. */
  onAutoAdvance?: () => void;
}
