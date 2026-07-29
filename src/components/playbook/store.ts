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
 * The *draft* slice persists to localStorage via `persist`'s `partialize`;
 * `activeTab`, `jobId` and the finished storyboard stay session-only and
 * reset on reload. That's what makes "Exit → confirm → save draft" work:
 * closing the take-over and reopening later restores where she was without
 * resurrecting a stale job id or a finished-but-abandoned storyboard.
 *
 * The draft slice carries the QUESTION SET and the position in it, not
 * just the typed idea. It originally held `ideaDraft` + `answers` alone,
 * which made "Pick up where you left off" structurally unable to do what
 * it says: the answers survived, but the questions they belonged to did
 * not, so the only reachable state was the idea screen with the text
 * refilled and every answer stranded. Nothing is stored server-side —
 * `generation_jobs` rows hold a job's INPUT and OUTPUT, never the
 * in-progress answer map — so localStorage is the whole of a draft, and
 * it has to hold everything needed to re-enter the flow.
 *
 * One draft at a time, by construction: this is a single slice, not a
 * collection. That is what the Library's Drafts section reflects.
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
  /** The generated question set the answers belong to. Persisted because
   *  the answers are meaningless without it — regenerating would produce a
   *  different set and orphan every answer she already gave. */
  questions: Question[];
  /** Index into `questions`. */
  questionIndex: number;
  /** Which screen she was on when she left, and so where resuming puts her
   *  back. `null` means there is no resumable draft. */
  draftPhase: "idea" | "questions" | null;
  /** When the draft was last put down (ISO). Drives the Library row's meta
   *  line; `null` for a draft that has never been exited. */
  draftSavedAt: string | null;
}

interface PlaybookState extends DraftSlice {
  // ---- tabs ----
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // ---- creation flow ----
  creationPhase: CreationPhase;
  jobId: string | null;
  storyboard: StoryboardOutput | null;

  setIdeaDraft: (idea: string) => void;
  setAnswer: (questionId: string, value: unknown) => void;
  setQuestionIndex: (index: number) => void;
  setJobId: (id: string | null) => void;

  /** idle -> idea. Opens the creation take-over, seeded optionally (e.g.
   *  from Home's "Let's go!" recommendation). */
  startCreation: (seedIdea?: string) => void;
  /** idle -> wherever the saved draft left off, question set and answers
   *  intact. No-ops when there is no resumable draft. */
  resumeDraft: () => void;
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
  questions: [],
  questionIndex: 0,
  draftPhase: null,
  draftSavedAt: null,
};

/** A draft is resumable once it has something to come back to: text she
 *  typed, or a question set she started answering. */
export function hasResumableDraft(state: DraftSlice): boolean {
  return (
    state.draftPhase !== null &&
    (state.ideaDraft.trim().length > 0 || state.questions.length > 0)
  );
}

export const usePlaybookStore = create<PlaybookState>()(
  persist(
    (set) => ({
      activeTab: "home",
      setActiveTab: (tab) => set({ activeTab: tab }),

      ...initialDraft,
      creationPhase: "idle",
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

      resumeDraft: () =>
        set((state) => {
          if (!hasResumableDraft(state)) return state;
          if (state.draftPhase === "questions" && state.questions.length > 0) {
            return {
              creationPhase: "questions",
              // Clamp: a persisted index can outrun a question set that
              // was itself persisted at a different length (or trimmed by
              // a schema change between releases).
              questionIndex: Math.min(
                state.questionIndex,
                state.questions.length - 1,
              ),
            };
          }
          return { creationPhase: "idea" };
        }),

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
              jobId: null,
              storyboard: null,
              ...initialDraft,
            };
          }
          // Keeping the draft means keeping the question set and the
          // position in it, not just the text — that pair is what makes
          // resuming land on the question she left off on.
          const resumeAt: DraftSlice["draftPhase"] =
            state.creationPhase === "questions" ? "questions" : "idea";
          return {
            creationPhase: "idle",
            jobId: null,
            storyboard: null,
            draftPhase: resumeAt,
            draftSavedAt: new Date().toISOString(),
          };
        }),

      discardDraft: () => set({ ...initialDraft }),
    }),
    {
      name: "pb-creation-draft",
      // Bumped from the implicit v0 because the persisted shape grew the
      // question set and the resume position. A v0 payload has neither, so
      // it migrates to "an idea-screen draft" rather than being read as a
      // question-screen draft with an empty question list.
      version: 1,
      migrate: (persisted, version) => {
        const prior = (persisted ?? {}) as Partial<DraftSlice>;
        if (version >= 1) return prior as DraftSlice;
        return {
          ...initialDraft,
          ideaDraft: prior.ideaDraft ?? "",
          answers: prior.answers ?? {},
          draftPhase: (prior.ideaDraft ?? "").trim() ? "idea" : null,
        } as DraftSlice;
      },
      partialize: (state) => ({
        ideaDraft: state.ideaDraft,
        answers: state.answers,
        questions: state.questions,
        questionIndex: state.questionIndex,
        draftPhase: state.draftPhase,
        draftSavedAt: state.draftSavedAt,
      }),
    },
  ),
);
