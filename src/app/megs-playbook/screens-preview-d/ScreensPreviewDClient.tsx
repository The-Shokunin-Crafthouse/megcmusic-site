"use client";

import { useState } from "react";
import { StoryboardResult } from "@/components/playbook/library/StoryboardResult";
import { LibraryTakeover } from "@/components/playbook/library/LibraryTakeover";
import { FirstRun } from "@/components/playbook/FirstRun";
import { ExitBar } from "@/components/playbook/creation/ExitBar";
import shared from "@/components/playbook/creation/creation.module.css";
import type { StoryboardOutput } from "@/lib/playbook/generation";
import storyboardFixture from "@/app/megs-playbook/__fixtures__/storyboard.json";

const FIXTURE_STORYBOARD = storyboardFixture as StoryboardOutput;
const FIXTURE_IDEA = "A behind-the-scenes reel about the night I almost cancelled a show.";
const FIXTURE_ANSWERS = { mood: "vulnerable", platform: "reels" };

type View = "creation" | "revisit" | "library" | "first-run";

function DebugControls({ view, onSelect }: { view: View; onSelect: (v: View) => void }) {
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
      {(["creation", "revisit", "library", "first-run"] as View[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          style={{ fontWeight: v === view ? 700 : 400 }}
        >
          {v}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          window.localStorage.removeItem("pb-first-run-done");
          window.location.reload();
        }}
      >
        Reset first-run flag
      </button>
      <span style={{ color: "#fff", fontSize: 11 }}>view: {view}</span>
    </div>
  );
}

export function ScreensPreviewDClient() {
  const [view, setView] = useState<View>("creation");
  const [libraryOpen, setLibraryOpen] = useState(false);

  function handleSelect(next: View) {
    setView(next);
    setLibraryOpen(next === "library");
  }

  return (
    <>
      <DebugControls view={view} onSelect={handleSelect} />
      <FirstRun />

      {view === "creation" ? (
        <div className={shared.screen} style={{ background: "var(--pb-bg-takeover)" }}>
          <StoryboardResult
            storyboard={FIXTURE_STORYBOARD}
            idea={FIXTURE_IDEA}
            answers={FIXTURE_ANSWERS}
            mode="creation"
            onExit={() => window.alert("onExit fired (would discard draft + close)")}
            onSaved={(id) => window.alert(`onSaved fired with id: ${id}`)}
          />
          <ExitBar onExit={() => window.alert("Exit tapped (CreationFlow owns this sheet)")} />
        </div>
      ) : null}

      {view === "revisit" ? (
        <div className={shared.screen} style={{ background: "var(--pb-bg-takeover)" }}>
          <StoryboardResult
            storyboard={FIXTURE_STORYBOARD}
            idea={FIXTURE_IDEA}
            answers={FIXTURE_ANSWERS}
            mode="revisit"
            savedId="fixture-id"
            onExit={() => window.alert("onExit fired (pop to list)")}
            onUseAsNewIdea={(idea) => window.alert(`onUseAsNewIdea: ${idea}`)}
          />
        </div>
      ) : null}

      <LibraryTakeover isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </>
  );
}
