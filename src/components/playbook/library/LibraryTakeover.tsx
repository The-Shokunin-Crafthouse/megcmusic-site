"use client";

/**
 * Storyboard library take-over (specs.md §"Screen 8" entry chrome + Screen
 * 9's "StackNavigator push inside the takeover, pop to return"). Mounts
 * `TakeoverModal` — whose own background is the creation-surface
 * `--pb-bg-takeover` teal, correct for the rest of the app's only other
 * take-over (the creation flow) but wrong here: this screen is
 * browse-surface (plum). Rather than branch the shared motion primitive on
 * a surface-family flag, this component paints its own plum background
 * over the full take-over from the inside (`.screen`, `min-height:100dvh`)
 * — the same "cover, don't fork the primitive" approach the codebase
 * already uses for chrome that only one caller needs.
 *
 * Two internal views inside one `StackNavigator`: the list (`LibraryScreen`,
 * plum) and a pushed storyboard detail (`StoryboardResult` in `revisit`
 * mode, which is *always* creation-surface teal per Screen 7's own spec —
 * `.storyboardSurface` layers that teal back on for just that pushed
 * screen). A single persistent top-left back affordance (CaretLeft +
 * "Home", per specs.md) does double duty: pops the stack back to the list
 * when a storyboard is open, or closes the whole takeover when already at
 * the list — the "pop to return" behavior specs.md calls for, without a
 * second control.
 */

import { useEffect, useRef, useState } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { TakeoverModal } from "../motion/TakeoverModal";
import { StackNavigator, type StackDirection } from "../motion/StackNavigator";
import { TapScale } from "../motion/TapScale";
import { usePlaybookStore } from "../store";
import { useStoryboard } from "../useStoryboards";
import { StoryboardResult } from "./StoryboardResult";
import { LibraryScreen } from "./LibraryScreen";
import type { Frame, StoryboardOutput, TitleOption } from "@/lib/playbook/generation";
import type { StoryboardRow } from "@/lib/playbook/types";
import shared from "../creation/creation.module.css";
import styles from "./LibraryTakeover.module.css";

export interface LibraryTakeoverProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = { kind: "list" } | { kind: "storyboard"; id: string };

const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

/** Maps a saved row onto `StoryboardOutput`'s shape for `StoryboardResult`.
 *  `hashtags` has no dedicated column (folded into `caption` on save, per
 *  the storyboards route's own comment) — an empty array satisfies the
 *  type without re-parsing them back out of the caption text, which
 *  `StoryboardResult` never reads in revisit mode anyway. Title options
 *  are reordered so the previously-chosen title is first: `StoryboardResult`
 *  defaults its revisit-mode selection to index 0, which is how the
 *  "selected" card is communicated across the fixed prop contract without
 *  adding a `chosenTitle` prop. */
function mapRowToStoryboardOutput(row: StoryboardRow): StoryboardOutput {
  const options: TitleOption[] = row.title_options ?? [];
  const chosenIndex = row.chosen_title
    ? options.findIndex((option) => option.title === row.chosen_title)
    : -1;
  const ordered =
    chosenIndex > 0
      ? [options[chosenIndex], ...options.slice(0, chosenIndex), ...options.slice(chosenIndex + 1)]
      : options;
  const titleOptions: TitleOption[] =
    ordered.length > 0
      ? ordered
      : [{ title: row.chosen_title ?? row.idea, rationale: "" }];
  const frames: Frame[] = row.frames ?? [];

  return {
    frames,
    titleOptions,
    caption: row.caption ?? "",
    hashtags: [],
    postingWindow: row.posting_window ?? "",
  };
}

function DetailSkeleton() {
  return (
    <div className={shared.content} aria-hidden="true">
      <div className={styles.detailSkeleton} />
      <div className={styles.detailSkeleton} />
      <div className={styles.detailSkeleton} />
    </div>
  );
}

function DetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={shared.content}>
      <p className={styles.errorText} role="status" aria-live="polite">
        Couldn&apos;t load the library.
      </p>
      <TapScale as="button" className={styles.retryText} onClick={onRetry}>
        Retry
      </TapScale>
    </div>
  );
}

export function LibraryTakeover({ isOpen, onClose }: LibraryTakeoverProps) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [direction, setDirection] = useState<StackDirection>("forward");
  const startCreation = usePlaybookStore((s) => s.startCreation);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Reset to the list + capture/return focus (studio learning #64: rAF
  // deferred so it runs after the opener re-mounts).
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement | null;
      setView({ kind: "list" });
      setDirection("forward");
      return;
    }
    const frame = requestAnimationFrame(() => openerRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Focus trap while open (matches ExitConfirm's pattern — the shared
  // TakeoverModal primitive provides role="dialog"/aria-modal but no trap
  // of its own).
  useEffect(() => {
    if (!isOpen) return;
    const node = wrapRef.current;
    const firstFocusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // Re-attach whenever the internal view changes so the trap's
    // querySelector list stays current after a StackNavigator push/pop.
  }, [isOpen, onClose, view]);

  function handleBack() {
    if (view.kind === "storyboard") {
      setDirection("back");
      setView({ kind: "list" });
      return;
    }
    onClose();
  }

  function openStoryboard(id: string) {
    setDirection("forward");
    setView({ kind: "storyboard", id });
  }

  function handleStartIdea() {
    onClose();
    startCreation();
  }

  function handleUseAsNewIdea(seedIdea: string) {
    onClose();
    startCreation(seedIdea);
  }

  const storyboardId = view.kind === "storyboard" ? view.id : null;
  const storyboardQuery = useStoryboard(storyboardId);
  const screenKey = view.kind === "storyboard" ? `storyboard-${view.id}` : "list";

  return (
    <TakeoverModal isOpen={isOpen} ariaLabel="Storyboard library">
      <div ref={wrapRef} className={styles.screen}>
        <TapScale
          as="button"
          className={styles.backRow}
          onClick={handleBack}
          ariaLabel={view.kind === "storyboard" ? "Back to storyboard library" : "Back to Home"}
        >
          <CaretLeft size={20} weight="bold" aria-hidden="true" />
          <span>Home</span>
        </TapScale>

        <StackNavigator screenKey={screenKey} direction={direction}>
          {view.kind === "list" ? (
            <LibraryScreen onOpen={openStoryboard} onStartIdea={handleStartIdea} />
          ) : storyboardQuery.isLoading ? (
            <DetailSkeleton />
          ) : storyboardQuery.isError ? (
            <DetailError onRetry={() => storyboardQuery.refetch()} />
          ) : storyboardQuery.data ? (
            <div className={styles.storyboardSurface}>
              <StoryboardResult
                storyboard={mapRowToStoryboardOutput(storyboardQuery.data)}
                idea={storyboardQuery.data.idea}
                answers={storyboardQuery.data.answers ?? {}}
                mode="revisit"
                savedId={storyboardQuery.data.id}
                onExit={handleBack}
                onUseAsNewIdea={handleUseAsNewIdea}
              />
            </div>
          ) : null}
        </StackNavigator>
      </div>
    </TakeoverModal>
  );
}
