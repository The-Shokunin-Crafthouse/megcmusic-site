"use client";

import { PlaybookShell } from "@/components/playbook/PlaybookShell";
import { CreationFlow } from "@/components/playbook/creation/CreationFlow";
import { usePlaybookStore } from "@/components/playbook/store";
import type { Question } from "@/lib/playbook/generation";
import questionsFixture from "@/app/megs-playbook/__fixtures__/questions.json";

const FIXTURE_QUESTIONS = questionsFixture.questions as Question[];

function DebugControls() {
  const creationPhase = usePlaybookStore((s) => s.creationPhase);
  const startCreation = usePlaybookStore((s) => s.startCreation);
  const advanceToQuestions = usePlaybookStore((s) => s.advanceToQuestions);

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: "rgba(0,0,0,0.6)",
        padding: 8,
        borderRadius: 8,
      }}
    >
      <button type="button" onClick={() => startCreation()}>
        Start (unseeded)
      </button>
      <button
        type="button"
        onClick={() => startCreation("Test seeding a fresh idea from Home")}
      >
        Start (seeded)
      </button>
      <button
        type="button"
        onClick={() => {
          startCreation("Idea for testing all six question types");
          advanceToQuestions(FIXTURE_QUESTIONS);
        }}
      >
        Jump to all 6 question types
      </button>
      <span style={{ color: "#fff", fontSize: 11 }}>phase: {creationPhase}</span>
    </div>
  );
}

export function ScreensPreviewCClient() {
  return (
    <>
      <PlaybookShell />
      <DebugControls />
      <CreationFlow />
    </>
  );
}
