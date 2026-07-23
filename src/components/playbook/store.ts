"use client";

/**
 * Shell-level client state for the Megs Playbook PWA (Sprint 10 P3).
 * Two concerns live here:
 *
 *  1. `activeTab` — which of the four bottom-nav destinations is showing
 *     (Home/Stats/Booking/Checklist), switched in-place per PLAN.md's
 *     "four tabs in client state, not four routes" decision.
 *  2. The creation-flow state machine — `idle → idea → questions →
 *     generating → storyboard`, driven by StackNavigator (P4 wires the
 *     screens; this store only owns the state transitions).
 *
 * Only the *draft* slice (`ideaDraft` + `answers`) persists to
 * localStorage, via `persist`'s `partialize` — everything else
 * (activeTab, phase, jobId, live question list, storyboard result) is
 * session-only and resets on reload. That's what makes "Exit → confirm →
 * save draft" work: closing the take-over and reopening later restores
 * what Meg typed/selected without resurrecting a stale job id or a
 * finished-but-abandoned storyboard.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Question, StoryboardOutput } from "@/lib/playbook/generation";

export type TabId = "home" | "stats" | "booking" | "checklist";

export type CreationPhase =
  | "idle"
  | "idea"
  | "questions"
  | "generating"
  | "storyboard";

interface DraftSlice {
  /** Free-text idea entry (Screen 5). */
  ideaDraft: string;
  /** Question-id -> answer value; shape varies by question type (string /
   *  string[] / number / boolean), same looseness as the server contract
   *  (`answersSchema` in generation.ts) since this is client scratch state. */
  answers: Record<string, unknown>;
}

interface PlaybookState extends DraftSlice {
  // ---- tabs ----
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // ---- creation flow ----
  creationPhase: CreationPhase;
  /** Index into `questions` for the question-page take-over (Screen 6). */
  questionIndex: number;
  questions: Question[];
  jobId: string | null;
  storyboard: StoryboardOutput | null;

  setIdeaDraft: (idea: string) => void;
  setAnswer: (questionId: string, value: unknown) => void;
  setQuestionIndex: (index: number) => void;
  setJobId: (id: string | null) => void;

  /** idle -> idea. Opens the creation take-over, seeded optionally (e.g.
   *  from Home's "Let's go!" recommendation). */
  startCreation: (seedIdea?: string) => void;
  /** idea -> questions. Stores the generated question set and rewinds to
   *  the first question. */
  advanceToQuestions: (questions: Question[]) => void;
  /** questions -> generating. Records the storyboard job id being polled. */
  advanceToGenerating: (jobId: string) => void;
  /** generating -> storyboard. Stores the finished result. */
  completeGeneration: (storyboard: StoryboardOutput) => void;
  /** Steps back one question, or returns to `idea` from the first question. */
  stepBack: () => void;
  /** Closes the take-over (Exit). Always keeps the persisted draft slice —
   *  pass `discardDraft: true` to also clear it (e.g. after a storyboard is
   *  saved and the draft is no longer needed). */
  exitCreation: (opts?: { discardDraft?: boolean }) => void;
  /** Clears the persisted draft without changing `creationPhase`. */
  discardDraft: () => void;
}

const initialDraft: DraftSlice = {
  ideaDraft: "",
  answers: {},
};

export const usePlaybookStore = create<PlaybookState>()(
  persist(
    (set) => ({
      activeTab: "home",
      setActiveTab: (tab) => set({ activeTab: tab }),

      ...initialDraft,
      creationPhase: "idle",
      questionIndex: 0,
      questions: [],
      jobId: null,
      storyboard: null,

      setIdeaDraft: (idea) => set({ ideaDraft: idea }),
      setAnswer: (questionId, value) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        })),
      setQuestionIndex: (index) => set({ questionIndex: index }),
      setJobId: (id) => set({ jobId: id }),

      startCreation: (seedIdea) =>
        set((state) => ({
          creationPhase: "idea",
          ideaDraft: seedIdea ?? state.ideaDraft,
        })),

      advanceToQuestions: (questions) =>
        set({
          creationPhase: "questions",
          questions,
          questionIndex: 0,
        }),

      advanceToGenerating: (jobId) =>
        set({ creationPhase: "generating", jobId }),

      completeGeneration: (storyboard) =>
        set({ creationPhase: "storyboard", storyboard }),

      stepBack: () =>
        set((state) => {
          if (state.creationPhase !== "questions") return state;
          if (state.questionIndex === 0) {
            return { creationPhase: "idea" };
          }
          return { questionIndex: state.questionIndex - 1 };
        }),

      exitCreation: (opts) =>
        set((state) => {
          if (opts?.discardDraft) {
            return {
              creationPhase: "idle",
              questionIndex: 0,
              questions: [],
              jobId: null,
              storyboard: null,
              ...initialDraft,
            };
          }
          return {
            creationPhase: "idle",
            questionIndex: 0,
            questions: [],
            jobId: null,
            storyboard: null,
          };
        }),

      discardDraft: () => set({ ...initialDraft }),
    }),
    {
      name: "pb-creation-draft",
      partialize: (state) => ({
        ideaDraft: state.ideaDraft,
        answers: state.answers,
      }),
    },
  ),
);
