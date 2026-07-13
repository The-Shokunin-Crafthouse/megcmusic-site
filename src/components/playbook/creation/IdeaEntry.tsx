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
 * Draft-restore row (specs.md §9.5): the store (`store.ts`, read-only
 * contract) has no "was this draft just seeded via startCreation, or is it
 * left over from a previous session" signal — `startCreation(seedIdea)`
 * and a plain persisted restore both just leave `ideaDraft` populated with
 * no provenance. Worked around locally: snapshot `ideaDraft` once on this
 * screen's first render; if it is still exactly that snapshot (and
 * non-empty) by the time we render, nothing changed it this session, so
 * it reads as "left over," not "just seeded." A seed that happens to
 * exactly match old persisted text is the one edge case this can't
 * distinguish — flagged in the sprint return, not silently papered over.
 */

import { useEffect, useRef, useState } from "react";
import { Microphone, Sparkle } from "@phosphor-icons/react";
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

  const createJob = useCreateJob();

  // ---- "Generate Storyboard" -> questions job ----
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genErrored, setGenErrored] = useState(false);
  const genJob = useGenerationJob(genJobId);

  useEffect(() => {
    if (!genJobId || !genJob.data) return;
    if (genJob.data.status === "done") {
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
    if (mibJob.data.status === "done") {
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
  const { supported: micSupported, listening, toggle: toggleMic } =
    useSpeechRecognition({
      onResult: (transcript) => {
        const current = usePlaybookStore.getState().ideaDraft;
        setIdeaDraft(current ? `${current} ${transcript}` : transcript);
      },
    });

  // ---- Draft-restore row (see file header) ----
  const hydrationDraftRef = useRef<string | null>(null);
  if (hydrationDraftRef.current === null) {
    hydrationDraftRef.current = ideaDraft;
  }
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const showRestoreRow =
    !restoreDismissed &&
    hydrationDraftRef.current.trim().length > 0 &&
    ideaDraft === hydrationDraftRef.current;

  return (
    <div className={shared.screen}>
      <div className={shared.content}>
        <div className={shared.headlineRow}>
          <h1 className={shared.headline}>What&apos;s your idea?</h1>
          {micSupported && !isFindingQuestions ? (
            <TapScale
              as="button"
              className={`${styles.micButton} ${listening ? styles.micListening : ""}`}
              onClick={toggleMic}
              ariaLabel={listening ? "Stop dictation" : "Dictate your idea"}
            >
              <Microphone weight={listening ? "fill" : "regular"} aria-hidden="true" />
              {listening ? <span className={styles.micRing} aria-hidden="true" /> : null}
            </TapScale>
          ) : null}
        </div>

        {isFindingQuestions ? (
          <div className={styles.waitBlock}>
            <p className={styles.waitLabel}>Finding the right questions&hellip;</p>
            <GenerationWait
              status={genErrored ? "error" : genJob.data?.status ?? "queued"}
              onRetry={() => setGenErrored(false)}
            />
          </div>
        ) : (
          <>
            {showRestoreRow ? (
              <TapScale
                as="button"
                className={styles.restoreRow}
                onClick={() => setRestoreDismissed(true)}
              >
                Pick up where you left off &rarr;
              </TapScale>
            ) : null}

            <textarea
              className={shared.paperCard}
              placeholder="I want to create a post where I’m…"
              value={ideaDraft}
              onChange={(event) => setIdeaDraft(event.target.value)}
              aria-label="Your idea"
            />

            <div className={styles.buttonRow}>
              <TapScale
                as="button"
                className={shared.pillButton}
                onClick={handleGenerateStoryboard}
                disabled={!ideaDraft.trim()}
              >
                Generate  Storyboard
              </TapScale>
              <TapScale
                as="button"
                className={shared.textButton}
                onClick={handleMakeItBetter}
                disabled={!ideaDraft.trim() || mibPhase === "loading"}
              >
                {mibPhase === "loading" ? "Sharpening…" : "Make it better"}
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
