"use client";

/**
 * Top-level client assembly for the Megs Playbook PWA (Sprint 10) — the one
 * place the four tab screens, the creation-flow take-over, and (P5-impl,
 * incoming) the storyboard result / library / first-run surfaces meet the
 * shell. `page.tsx` renders this and nothing else.
 *
 * Library wiring note: HomeScreen exposes `onOpenLibrary`; the Library
 * screen lands with the P5 implementation pass — until then the row simply
 * doesn't render (HomeScreen hides it when the callback is undefined).
 */

import { PlaybookShell } from "./PlaybookShell";
import { CreationFlow } from "./creation/CreationFlow";
import { HomeScreen } from "./screens/HomeScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { BookingScreen } from "./screens/BookingScreen";
import { ChecklistScreen } from "./screens/ChecklistScreen";

export function PlaybookApp() {
  return (
    <>
      <PlaybookShell
        panels={{
          home: <HomeScreen />,
          stats: <StatsScreen />,
          booking: <BookingScreen />,
          checklist: <ChecklistScreen />,
        }}
      />
      <CreationFlow />
    </>
  );
}
