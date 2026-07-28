"use client";

/**
 * Creation flow — idea entry (spec §Screen 5, 1:1). Owns three local jobs:
 *  - "Generate Storyboard" -> a `questions` job; on success calls
 *    `advanceToQuestions` (store) after telling the parent to set
 *    StackNavigator's direction forward.
 *  - "Make it better" -> a `make_it_better` job; swaps the textarea
 *    content to the sharpened idea and shows the before/after compare
 *    strip (specs.md §9.12).
 *  - Mic dictation (Web Speech API, feature-detected at runtime —
 *    `useSpeechRecognition`).
 *
 * Draft-restore row (specs.md §9.5): the store now records where a saved
 * draft was put down (`draftPhase` + the persisted question set), so this
 * row resumes into the flow at that point instead of merely acknowledging
 * that the textarea was pre-filled. It used to be a label with a no-op
 * handler — tapping it dismissed itself and left her on the idea screen
 * with her answers stranded, because the question set they belonged to was
 * never persisted at all.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Microphone, Sparkle, X } from "@phosphor-icons/react";
import { usePlaybookStore } from "../store";
import { useCreateJob, useGenerationJob } from "../useGenerationJob";
import { GenerationWait } from "../GenerationWait";
import { TapScale } from "../motion/TapScale";
import {
  makeItBetterOutputSchema,
  questionsOutputSchema,
} from "@/lib/playbook/generation";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { ExitBar } from "./ExitBar";
import shared from "./creation.module.css";
import styles from "./IdeaEntry.module.css";

interface IdeaEntryProps {
  onExit: () => void;
  /** Tells CreationFlow to set the StackNavigator direction to "forward"
   *  right before the store phase actually advances. */
  onWillAdvance: () => void;
}

type MakeItBetterPhase = "idle" | "loading" | "result";

export function IdeaEntry({ onExit, onWillAdvance }: IdeaEntryProps) {
  const ideaDraft = usePlaybookStore((s) => s.ideaDraft);
  const setIdeaDraft = usePlaybookStore((s) => s.setIdeaDraft);
  const advanceToQuestions = usePlaybookStore((s) => s.advanceToQuestions);
  const resumeDraft = usePlaybookStore((s) => s.resumeDraft);
  const draftPhase = usePlaybookStore((s) => s.draftPhase);
  const draftQuestions = usePlaybookStore((s) => s.questions);
  const draftQuestionIndex = usePlaybookStore((s) => s.questionIndex);

  const createJob = useCreateJob();

  // ---- "Generate Storyboard" -> questions job ----
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genErrored, setGenErrored] = useState(false);
  const genJob = useGenerationJob(genJobId);

  useEffect(() => {
    if (!genJobId || !genJob.data) return;
    // done-with-no-output = a cache seed or a partial row; wait for the poll
    // that carries the real output (same guard as CreationFlow's storyboard
    // effect — e2e known-bugs spec).
    if (genJob.data.status === "done" && genJob.data.output !== null) {
      const parsed = questionsOutputSchema.safeParse(genJob.data.output);
      if (parsed.success) {
        onWillAdvance();
        advanceToQuestions(parsed.data.questions);
      } else {
        setGenErrored(true);
      }
      setGenJobId(null);
    } else if (genJob.data.status === "error") {
      setGenErrored(true);
      setGenJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genJob.data, genJobId]);

  function handleGenerateStoryboard() {
    if (!ideaDraft.trim() || genJobId) return;
    setGenErrored(false);
    createJob.mutate(
      { kind: "questions", input: { idea: ideaDraft } },
      { onSuccess: (result) => setGenJobId(result.id) },
    );
  }

  const isFindingQuestions = Boolean(genJobId) || genErrored;

  // ---- "Make it better" -> make_it_better job ----
  const [mibPhase, setMibPhase] = useState<MakeItBetterPhase>("idle");
  const [mibJobId, setMibJobId] = useState<string | null>(null);
  const [mibWhy, setMibWhy] = useState("");
  const [mibOriginal, setMibOriginal] = useState("");
  const mibJob = useGenerationJob(mibJobId);

  useEffect(() => {
    if (!mibJobId || !mibJob.data) return;
    // Same done-with-no-output guard as the questions effect above.
    if (mibJob.data.status === "done" && mibJob.data.output !== null) {
      const parsed = makeItBetterOutputSchema.safeParse(mibJob.data.output);
      if (parsed.success) {
        setIdeaDraft(parsed.data.sharpened);
        setMibWhy(parsed.data.why);
        setMibPhase("result");
      } else {
        setMibPhase("idle");
      }
      setMibJobId(null);
    } else if (mibJob.data.status === "error") {
      setMibPhase("idle");
      setMibJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mibJob.data, mibJobId]);

  function handleMakeItBetter() {
    if (!ideaDraft.trim() || mibPhase === "loading" || mibJobId) return;
    const original = ideaDraft;
    setMibPhase("loading");
    createJob.mutate(
      { kind: "make_it_better", input: { idea: original } },
      {
        onSuccess: (result) => {
          setMibOriginal(original);
          setMibJobId(result.id);
        },
        onError: () => setMibPhase("idle"),
      },
    );
  }

  // ---- Mic dictation ----
  const {
    supported: micSupported,
    listening,
    error: micError,
    start: startMic,
    cancel: cancelMic,
  } = useSpeechRecognition({
    onResult: (transcript) => {
      const current = usePlaybookStore.getState().ideaDraft;
      setIdeaDraft(current ? `${current} ${transcript}` : transcript);
    },
  });

  // ---- Auto-growing idea card (specs.md §Screen 5 "paper" card) ----
  // "Make it better" replaces the textarea's contents with a longer,
  // sharpened idea, which the fixed 200px card then hides behind a nested
  // scroll — a scroll inside a page that also scrolls, on the one control
  // she is meant to be reading. The card grows to its content instead and
  // keeps `--pb-input-min-height` as a floor. `useLayoutEffect` so the
  // height is written before paint and the card never flashes at the
  // wrong size when the sharpened text lands.
  const ideaCardRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const node = ideaCardRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [ideaDraft, isFindingQuestions]);

  // ---- Draft-restore row (see file header) ----
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const resumeQuestion =
    draftPhase === "questions" && draftQuestions.length > 0
      ? {
          index: Math.min(draftQuestionIndex, draftQuestions.length - 1),
          total: draftQuestions.length,
        }
      : null;
  const showRestoreRow = !restoreDismissed && resumeQuestion !== null;

  const handleResume = useCallback(() => {
    onWillAdvance();
    resumeDraft();
  }, [onWillAdvance, resumeDraft]);

  return (
    <div className={shared.screen}>
      <div className={shared.content}>
        <div className={shared.headlineRow}>
          <h1 className={shared.headline}>What&apos;s your idea?</h1>
          {micSupported && !isFindingQuestions ? (
            <TapScale
              as="button"
              className={`${styles.micButton} ${listening ? styles.micListening : ""}`}
              onClick={listening ? cancelMic : startMic}
              ariaLabel={listening ? "Stop dictation" : "Dictate your idea"}
            >
              <Microphone weight={listening ? "fill" : "regular"} aria-hidden="true" />
              {listening ? <span className={styles.micRing} aria-hidden="true" /> : null}
            </TapScale>
          ) : null}
        </div>

        {isFindingQuestions ? (
          <div className={styles.waitBlock}>
            <GenerationWait
              status={genErrored ? "error" : genJob.data?.status ?? "queued"}
              label="Finding the right questions…"
              onRetry={() => setGenErrored(false)}
            />
          </div>
        ) : (
          <>
            {/* A saved draft is reachable from here as well as from the
                Library, because this is the screen she lands on when she
                taps the idea mark — the draft has to be visible where the
                work restarts, not only where finished work is filed. */}
            {showRestoreRow && resumeQuestion ? (
              <div className={styles.restoreBlock}>
                <TapScale
                  as="button"
                  className={styles.restoreRow}
                  onClick={handleResume}
                  ariaLabel={`Pick up where you left off, question ${resumeQuestion.index + 1} of ${resumeQuestion.total}`}
                >
                  Pick up where you left off &mdash; question{" "}
                  {resumeQuestion.index + 1} of {resumeQuestion.total} &rarr;
                </TapScale>
                <TapScale
                  as="button"
                  className={styles.restoreDismiss}
                  onClick={() => setRestoreDismissed(true)}
                  ariaLabel="Start fresh instead"
                >
                  <X size={14} weight="bold" aria-hidden="true" />
                </TapScale>
              </div>
            ) : null}

            {listening ? (
              <div className={styles.micStatus} role="status" aria-live="polite">
                <span className={styles.micStatusText}>Listening&hellip;</span>
                <TapScale
                  as="button"
                  className={styles.micStop}
                  onClick={cancelMic}
                  ariaLabel="Stop listening"
                >
                  Stop
                </TapScale>
              </div>
            ) : null}

            {micError ? (
              <p className={styles.micError} role="alert">
                {micError}
              </p>
            ) : null}

            <textarea
              ref={ideaCardRef}
              className={`${shared.paperCard} ${styles.ideaCard}`}
              placeholder="I want to create a post where I’m…"
              value={ideaDraft}
              onChange={(event) => setIdeaDraft(event.target.value)}
              aria-label="Your idea"
              rows={1}
            />

            {/* "Make it better" sharpens what is already there; "Generate
                Storyboard" is the step forward. Reading order puts the
                revise action first and the advance action last, so the
                primary sits where the thumb ends its pass. */}
            <div className={styles.buttonRow}>
              <TapScale
                as="button"
                className={shared.textButton}
                onClick={handleMakeItBetter}
                disabled={!ideaDraft.trim() || mibPhase === "loading"}
              >
                {mibPhase === "loading" ? "Sharpening…" : "Make it better"}
              </TapScale>
              <TapScale
                as="button"
                className={shared.ctaButton}
                onClick={handleGenerateStoryboard}
                disabled={!ideaDraft.trim()}
              >
                Generate  Storyboard
              </TapScale>
            </div>

            {mibPhase === "result" ? (
              <div className={styles.mibStrip} role="status" aria-live="polite">
                <p className={styles.mibWhy}>
                  <Sparkle size={12} weight="fill" aria-hidden="true" />
                  Why: {mibWhy}
                </p>
                <p className={styles.mibBefore}>Before: {mibOriginal}</p>
                <div className={styles.mibActions}>
                  <TapScale
                    as="button"
                    className={styles.mibKeep}
                    onClick={() => setMibPhase("idle")}
                  >
                    Keep it
                  </TapScale>
                  <TapScale
                    as="button"
                    className={styles.mibRevert}
                    onClick={() => {
                      setIdeaDraft(mibOriginal);
                      setMibPhase("idle");
                    }}
                  >
                    Put it back
                  </TapScale>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <ExitBar onExit={onExit} />
    </div>
  );
}
