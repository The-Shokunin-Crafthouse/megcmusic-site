"use client";

/**
 * Top-level client assembly for the Megs Playbook PWA (Sprint 10) — the one
 * place the four tab screens, the creation-flow take-over, and the
 * storyboard result / library / first-run surfaces (P5) meet the shell.
 * `page.tsx` renders this and nothing else.
 *
 * `onExit`/`onSaved` wiring for the storyboard-result screen (specs.md
 * §9.5, a resolved judgment call — see StoryboardResult.tsx's own header
 * comment for the full reasoning):
 *  - `onExit` fires only from the post-save "Saved ✓ — View in library"
 *    pill, so it always discards the now-redundant draft
 *    (`exitCreation({discardDraft:true})`) — "a saved storyboard consumes
 *    the draft." The screen's *plain* Exit tap is CreationFlow's own
 *    ExitBar/ExitConfirm sheet (untouched here), whose existing "Save
 *    draft & exit" / "Discard draft" choice already covers "plain
 *    Exit-without-save keeps [or discards, by explicit choice] it."
 *  - `onSaved` opens the library takeover — called by the pill tap
 *    *after* `onExit()`, once a real id exists to hand to `LibraryTakeover`
 *    (not used to auto-open the library the instant the save network call
 *    resolves, which would jump the screen out from under Meghan before
 *    she chose to leave).
 */

import { useState } from "react";
import { PlaybookShell } from "./PlaybookShell";
import { CreationFlow } from "./creation/CreationFlow";
import { HomeScreen } from "./screens/HomeScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { BookingScreen } from "./screens/BookingScreen";
import { ChecklistScreen } from "./screens/ChecklistScreen";
import { StoryboardResult } from "./library/StoryboardResult";
import { LibraryTakeover } from "./library/LibraryTakeover";
import { FirstRun } from "./FirstRun";
import { usePlaybookStore } from "./store";

export function PlaybookApp() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const ideaDraft = usePlaybookStore((s) => s.ideaDraft);
  const answers = usePlaybookStore((s) => s.answers);
  const exitCreation = usePlaybookStore((s) => s.exitCreation);

  return (
    <>
      <FirstRun />
      <PlaybookShell
        panels={{
          home: <HomeScreen onOpenLibrary={() => setLibraryOpen(true)} />,
          stats: <StatsScreen />,
          booking: <BookingScreen />,
          checklist: <ChecklistScreen />,
        }}
      />
      <CreationFlow
        renderStoryboard={(storyboard) => (
          <StoryboardResult
            storyboard={storyboard}
            idea={ideaDraft}
            answers={answers}
            mode="creation"
            onExit={() => exitCreation({ discardDraft: true })}
            onSaved={() => setLibraryOpen(true)}
          />
        )}
      />
      <LibraryTakeover isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </>
  );
}
