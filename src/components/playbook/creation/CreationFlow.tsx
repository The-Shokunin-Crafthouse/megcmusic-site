"use client";

/**
 * Creation-flow orchestrator (sprint brief §3.6, §7). Mounts
 * `TakeoverModal` + `StackNavigator` and switches screens purely off the
 * store's `creationPhase`:
 *
 *   idle       -> renders nothing
 *   idea       -> IdeaEntry
 *   questions  -> QuestionPage (one push per `questionIndex`)
 *   generating -> GenerationWait, full narrative, bound to the storyboard
 *                 job (`jobId`)
 *   storyboard -> `renderStoryboard` handoff slot (Screen 7, a later
 *                 agent's build) — falls back to a minimal placeholder
 *
 * IdeaEntry and QuestionPage each own their own generation job
 * (`questions` / `storyboard`) and call the store directly; this
 * component only owns phase-level screen selection, the StackNavigator
 * push/pop direction, and the Exit-confirm sheet.
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePlaybookStore } from "../store";
import { useCreateJob, useGenerationJob } from "../useGenerationJob";
import { GenerationWait } from "../GenerationWait";
import { TakeoverModal } from "../motion/TakeoverModal";
import { StackNavigator, type StackDirection } from "../motion/StackNavigator";
import { storyboardOutputSchema, type StoryboardOutput } from "@/lib/playbook/generation";
import { IdeaEntry } from "./IdeaEntry";
import { QuestionPage } from "./QuestionPage";
import { ExitConfirm } from "./ExitConfirm";
import { ExitBar } from "./ExitBar";
import shared from "./creation.module.css";
import styles from "./CreationFlow.module.css";

export interface CreationFlowProps {
  /** Renders the finished storyboard result (Screen 7 — a later agent's
   *  build). Defaults to a minimal placeholder so the flow has a
   *  reachable terminus today. */
  renderStoryboard?: (storyboard: StoryboardOutput) => ReactNode;
}

function getPartialTail(output: Record<string, unknown> | null | undefined): string | null {
  if (!output || typeof output !== "object") return null;
  const partial = (output as { partial?: unknown }).partial;
  if (typeof partial !== "string") return null;
  const trimmed = partial.trim();
  if (!trimmed) return null;
  const tail = trimmed.slice(-220);
  return tail.length < trimmed.length ? `…${tail}` : tail;
}

export function CreationFlow({ renderStoryboard }: CreationFlowProps) {
  const creationPhase = usePlaybookStore((s) => s.creationPhase);
  const questionIndex = usePlaybookStore((s) => s.questionIndex);
  const jobId = usePlaybookStore((s) => s.jobId);
  const storyboard = usePlaybookStore((s) => s.storyboard);
  const ideaDraft = usePlaybookStore((s) => s.ideaDraft);
  const answers = usePlaybookStore((s) => s.answers);
  const exitCreation = usePlaybookStore((s) => s.exitCreation);
  const advanceToGenerating = usePlaybookStore((s) => s.advanceToGenerating);
  const completeGeneration = usePlaybookStore((s) => s.completeGeneration);

  const [direction, setDirection] = useState<StackDirection>("forward");
  const [exitOpen, setExitOpen] = useState(false);

  const createJob = useCreateJob();
  const storyboardJob = useGenerationJob(creationPhase === "generating" ? jobId : null);

  useEffect(() => {
    if (creationPhase !== "generating") return;
    const data = storyboardJob.data;
    if (data?.status !== "done" || !data.output) return;
    const parsed = storyboardOutputSchema.safeParse(data.output);
    if (parsed.success) completeGeneration(parsed.data);
    // A parse failure on a "done" job falls through to GenerationWait's
    // default (non-"error") branch rather than a hand-rolled error state —
    // an honest gap: the daemon's own retry/repair loop (agent/, P6) is
    // the real backstop for malformed output, not this screen.
  }, [creationPhase, storyboardJob.data, completeGeneration]);

  const goForward = useCallback(() => setDirection("forward"), []);
  const goBack = useCallback(() => setDirection("back"), []);
  const openExit = useCallback(() => setExitOpen(true), []);
  const closeExit = useCallback(() => setExitOpen(false), []);

  function handleRetryStoryboard() {
    createJob.mutate(
      { kind: "storyboard", input: { idea: ideaDraft, answers } },
      { onSuccess: (result) => advanceToGenerating(result.id) },
    );
  }

  if (creationPhase === "idle") return null;

  let screenKey = "idea";
  let content: ReactNode = null;

  if (creationPhase === "idea") {
    screenKey = "idea";
    content = <IdeaEntry onExit={openExit} onWillAdvance={goForward} />;
  } else if (creationPhase === "questions") {
    screenKey = `question-${questionIndex}`;
    content = (
      <QuestionPage onExit={openExit} onWillGoForward={goForward} onWillGoBack={goBack} />
    );
  } else if (creationPhase === "generating") {
    screenKey = "generating";
    const status = storyboardJob.data?.status ?? "queued";
    content = (
      <div className={shared.screen}>
        <div className={shared.content}>
          <p className={styles.waitLabel}>Building your storyboard&hellip;</p>
          <GenerationWait status={status} onRetry={handleRetryStoryboard}>
            {(() => {
              const tail = getPartialTail(storyboardJob.data?.output);
              return tail ? <p className={styles.partialText}>{tail}</p> : null;
            })()}
          </GenerationWait>
        </div>
        <ExitBar onExit={openExit} />
      </div>
    );
  } else if (creationPhase === "storyboard" && storyboard) {
    // Screen 7 (Storyboard result, specs.md §"Screen 7") — this component
    // owns only the outer `shared.screen` flex column + the shared
    // ExitBar/ExitConfirm sheet, identical to every other creation-flow
    // screen; `renderStoryboard` supplies the content + bottom action bar
    // (StoryboardResult, mode="creation") as a fragment that lands above
    // the ExitBar. Falls back to a minimal placeholder when no
    // `renderStoryboard` is supplied (e.g. an isolated preview route).
    screenKey = "storyboard";
    content = (
      <div className={shared.screen}>
        {renderStoryboard ? (
          renderStoryboard(storyboard)
        ) : (
          <div className={shared.content}>
            <div className={shared.headlineRow}>
              <h1 className={shared.headline}>Your storyboard</h1>
              <span className={styles.frameCount}>{storyboard.frames.length} frames</span>
            </div>
            <p className={styles.placeholderNote}>Save coming soon.</p>
            <ul className={styles.placeholderFrameList}>
              {storyboard.frames.map((frame, index) => (
                <li key={index} className={styles.placeholderFrame}>
                  {frame.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ExitBar onExit={openExit} />
      </div>
    );
  }

  return (
    <>
      <TakeoverModal isOpen ariaLabel="Create a new post">
        <StackNavigator screenKey={screenKey} direction={direction}>
          {content}
        </StackNavigator>
      </TakeoverModal>
      <ExitConfirm
        isOpen={exitOpen}
        onClose={closeExit}
        onSaveAndExit={() => {
          exitCreation();
          closeExit();
        }}
        onDiscard={() => {
          exitCreation({ discardDraft: true });
          closeExit();
        }}
      />
    </>
  );
}
