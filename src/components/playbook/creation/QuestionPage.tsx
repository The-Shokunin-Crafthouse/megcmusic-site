"use client";

/**
 * Creation flow — question ENGINE (spec §Screen 6, specs.md §9.11). Renders
 * purely from `question.type` via `questionTypes/index.ts`'s registry —
 * never a hardcoded per-question layout. Owns Back/Next, progress ("N of
 * M"), required-answer enforcement, and the final `storyboard` job submit.
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePlaybookStore } from "../store";
import { useCreateJob } from "../useGenerationJob";
import { tapScaleSpring } from "../motion/springs";
import { TapScale } from "../motion/TapScale";
import { ExitBar } from "./ExitBar";
import { QUESTION_TYPE_COMPONENTS } from "./questionTypes";
import shared from "./creation.module.css";
import styles from "./QuestionPage.module.css";

interface QuestionPageProps {
  onExit: () => void;
  onWillGoForward: () => void;
  onWillGoBack: () => void;
}

const REQUIRED_ERROR_ID = "pb-question-required-error";

function isAnswerEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  // booleans/numbers: any value that made it into `answers` counts as
  // answered (yes_no's `false` is a real answer, not an empty one).
  return false;
}

export function QuestionPage({ onExit, onWillGoForward, onWillGoBack }: QuestionPageProps) {
  const questions = usePlaybookStore((s) => s.questions);
  const questionIndex = usePlaybookStore((s) => s.questionIndex);
  const answers = usePlaybookStore((s) => s.answers);
  const ideaDraft = usePlaybookStore((s) => s.ideaDraft);
  const setAnswer = usePlaybookStore((s) => s.setAnswer);
  const setQuestionIndex = usePlaybookStore((s) => s.setQuestionIndex);
  const stepBack = usePlaybookStore((s) => s.stepBack);
  const advanceToGenerating = usePlaybookStore((s) => s.advanceToGenerating);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const createJob = useCreateJob();
  const reducedMotion = useReducedMotion();

  const question = questions[questionIndex];

  // Reset the "attempted" error state whenever the question changes.
  useEffect(() => {
    setAttemptedSubmit(false);
  }, [questionIndex]);

  if (!question) return null;

  const value = answers[question.id];
  const isLast = questionIndex === questions.length - 1;
  const disabled = question.required && isAnswerEmpty(value);
  const QuestionComponent = QUESTION_TYPE_COMPONENTS[question.type];

  function goToQuestion(nextIndex: number) {
    onWillGoForward();
    setQuestionIndex(nextIndex);
  }

  function submitStoryboard() {
    setSubmitError(false);
    createJob.mutate(
      { kind: "storyboard", input: { idea: ideaDraft, answers } },
      {
        onSuccess: (result) => {
          onWillGoForward();
          advanceToGenerating(result.id);
        },
        onError: () => setSubmitError(true),
      },
    );
  }

  function handleNext() {
    if (disabled) {
      setAttemptedSubmit(true);
      return;
    }
    if (isLast) {
      submitStoryboard();
      return;
    }
    goToQuestion(questionIndex + 1);
  }

  function handleBack() {
    onWillGoBack();
    stepBack();
  }

  function handleAutoAdvance() {
    if (isLast) {
      submitStoryboard();
      return;
    }
    goToQuestion(questionIndex + 1);
  }

  const showRequiredError = attemptedSubmit && disabled;

  return (
    <div className={shared.screen}>
      <div className={shared.content}>
        <div className={shared.headlineRow}>
          <h1 className={shared.headline}>{question.question}</h1>
          <span className={styles.progress}>
            {questionIndex + 1} of {questions.length}
          </span>
        </div>

        <QuestionComponent
          question={question}
          value={value}
          onChange={(next) => setAnswer(question.id, next)}
          onAutoAdvance={handleAutoAdvance}
        />

        {showRequiredError ? (
          <p id={REQUIRED_ERROR_ID} className={styles.requiredError} role="alert">
            This one needs an answer
          </p>
        ) : null}

        {submitError ? (
          <p className={styles.requiredError} role="alert">
            That didn&apos;t send. Try again.
          </p>
        ) : null}

        <div className={styles.buttonRow}>
          <TapScale as="button" className={styles.backButton} onClick={handleBack}>
            Back
          </TapScale>
          <motion.button
            type="button"
            className={styles.nextButton}
            onClick={handleNext}
            aria-disabled={disabled || undefined}
            aria-describedby={showRequiredError ? REQUIRED_ERROR_ID : undefined}
            whileTap={reducedMotion ? undefined : { scale: 0.92 }}
            transition={tapScaleSpring}
          >
            {isLast
              ? createJob.isPending
                ? "Generating…"
                : "Generate  Storyboard"
              : "Next"}
          </motion.button>
        </div>
      </div>
      <ExitBar onExit={onExit} />
    </div>
  );
}
