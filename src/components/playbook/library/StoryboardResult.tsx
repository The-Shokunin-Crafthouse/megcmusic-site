"use client";

/**
 * Screen 7 — Storyboard result (specs.md §"Screen 7"). The creation flow's
 * terminus: title pick -> frame cards (description / on-screen text / a
 * collapsible tap-to-copy asset prompt) -> caption -> posting window ->
 * bottom action bar.
 *
 * Two modes, one component (specs.md's own framing):
 *  - `creation` — regenerate affordances live (per-frame + "Fresh titles"),
 *    title selection is required before "Save to library" enables, and a
 *    successful save swaps the pill to "Saved ✓ — View in library".
 *  - `revisit` — opened from the Library (Screen 8) for an already-saved
 *    storyboard: regenerate hidden, title cards render as a read-only
 *    reflection of what was saved (no live radiogroup — reselecting a
 *    title isn't part of this pass's spec'd interactions), copy actions
 *    still live, bottom bar is "Use as new idea" instead of Save.
 *
 * Caller-owned chrome (kept out of this file so it works unmodified in
 * both contexts):
 *  - `creation` mode is rendered inside CreationFlow.tsx's existing
 *    `shared.screen` + `<ExitBar>` wrapper (identical to every other
 *    creation-flow screen) — this component renders only its own
 *    `shared.content` block plus the bottom action bar, as a fragment, so
 *    the caller's ExitBar still lands last in that flex column.
 *  - `revisit` mode is rendered inside LibraryTakeover's own
 *    creation-surface wrapper (no ExitBar there — the takeover's back
 *    affordance owns "leave this screen").
 *
 * `onExit`'s two callers read the store's exitCreation semantics
 * differently (specs.md §9.5, resolved judgment call — see PlaybookApp.tsx
 * header comment): in `creation` mode it's wired to fire only from the
 * post-save confirmation pill (consumes the draft); the screen's *plain*
 * Exit tap is CreationFlow's own ExitBar/ExitConfirm sheet, untouched by
 * this component. In `revisit` mode the caller repurposes `onExit` as
 * "pop back to the library list" — this component never calls it itself
 * there (no internal affordance needs it), it's accepted only to keep one
 * prop contract across both modes.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowCircleUp,
  ArrowsClockwise,
  CaretDown,
  CheckSquare,
  Copy,
} from "@phosphor-icons/react";
import { TapScale } from "../motion/TapScale";
import { Staggered } from "../motion/Staggered";
import { tapScaleSpring, REDUCED_MOTION_TRANSITION } from "../motion/springs";
import { useCreateJob, useGenerationJob } from "../useGenerationJob";
import { useSaveStoryboard } from "../useStoryboards";
import {
  storyboardOutputSchema,
  titlesOutputSchema,
  type Frame,
  type StoryboardOutput,
  type TitleOption,
} from "@/lib/playbook/generation";
import shared from "../creation/creation.module.css";
import styles from "./StoryboardResult.module.css";

export type StoryboardResultMode = "creation" | "revisit";

export interface StoryboardResultProps {
  storyboard: StoryboardOutput;
  idea: string;
  answers: Record<string, unknown>;
  mode: StoryboardResultMode;
  savedId?: string;
  onSaved?: (id: string) => void;
  onExit: () => void;
  onUseAsNewIdea?: (idea: string) => void;
}

type ActiveRegen = { type: "titles" } | { type: "frame"; index: number };

/** "Fresh titles" keeps the currently-selected card pinned in place and
 *  replaces every other slot with a fresh option (specs.md: "new options
 *  replace unselected cards"). Falls back to a full replace when nothing
 *  is selected yet. */
function mergeFreshTitles(
  current: TitleOption[],
  selectedIndex: number | null,
  fresh: TitleOption[],
): TitleOption[] {
  if (selectedIndex === null) return fresh;
  let freshCursor = 0;
  return current.map((existing, index) => {
    if (index === selectedIndex) return existing;
    const next = fresh[freshCursor];
    freshCursor += 1;
    return next ?? existing;
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
}

interface CopyRowProps {
  text: string;
  label: string;
  className?: string;
}

function CopyRow({ text, label, className }: CopyRowProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function handleCopy() {
    const succeeded = await copyText(text);
    if (!succeeded) return;
    setCopied(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <TapScale
      as="button"
      className={[styles.copyRow, className].filter(Boolean).join(" ")}
      onClick={handleCopy}
      accentFlash
      ariaLabel={copied ? "Copied" : label}
    >
      {copied ? (
        <CheckSquare size={16} weight="fill" className={styles.copyIconDone} aria-hidden="true" />
      ) : (
        <Copy size={16} className={styles.copyIcon} aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </TapScale>
  );
}

interface TitleCardProps {
  option: TitleOption;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}

function TitleCard({ option, selected, interactive, onSelect }: TitleCardProps) {
  const reducedMotion = useReducedMotion();
  const className = [styles.titleCard, selected ? styles.titleCardSelected : ""]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <p className={styles.titleCardTitle}>{option.title}</p>
      <p className={styles.titleCardRationale}>{option.rationale}</p>
    </>
  );

  if (!interactive) {
    return (
      <div className={className} aria-current={selected || undefined}>
        {body}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      className={className}
      onClick={onSelect}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={tapScaleSpring}
    >
      {body}
    </motion.button>
  );
}

interface FrameCardProps {
  frame: Frame;
  index: number;
  total: number;
  canRegenerate: boolean;
  regenerateDisabled: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

function frameRoleLabel(index: number, total: number): string {
  if (index === 0) return "Hook";
  if (index === total - 1) return "CTA";
  return "Body";
}

function FrameCard({
  frame,
  index,
  total,
  canRegenerate,
  regenerateDisabled,
  isRegenerating,
  onRegenerate,
}: FrameCardProps) {
  const [assetOpen, setAssetOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const regionId = `pb-frame-asset-${index}`;

  return (
    <div
      className={[styles.frameCard, isRegenerating ? styles.framePulsing : ""]
        .filter(Boolean)
        .join(" ")}
      aria-busy={isRegenerating || undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={frame.description}
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={reducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.22 }}
        >
          <div className={styles.frameHeader}>
            <p className={styles.frameEyebrow}>
              Frame {index + 1} — {frameRoleLabel(index, total)}
            </p>
            {canRegenerate ? (
              <TapScale
                as="button"
                className={styles.regenerateButton}
                onClick={onRegenerate}
                disabled={regenerateDisabled}
                ariaLabel={`Regenerate frame ${index + 1}`}
              >
                <ArrowsClockwise size={16} aria-hidden="true" />
              </TapScale>
            ) : null}
          </div>

          <p className={styles.frameDescription}>{frame.description}</p>

          {frame.onScreenText ? (
            <div className={styles.onScreenBlock}>
              <p className={styles.onScreenLabel}>On screen</p>
              <p className={styles.onScreenText}>&ldquo;{frame.onScreenText}&rdquo;</p>
            </div>
          ) : null}

          <button
            type="button"
            className={styles.assetTrigger}
            aria-expanded={assetOpen}
            aria-controls={regionId}
            onClick={() => setAssetOpen((prev) => !prev)}
          >
            <span>Asset prompt</span>
            <CaretDown
              size={12}
              className={assetOpen ? styles.caretOpen : styles.caret}
              aria-hidden="true"
            />
          </button>
          <div id={regionId} className={styles.assetRegion} data-open={assetOpen}>
            <div className={styles.assetInner}>
              <p className={styles.assetPromptText}>{frame.assetPrompt}</p>
              <CopyRow text={frame.assetPrompt} label="Copy prompt" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function StoryboardResult({
  storyboard,
  idea,
  answers,
  mode,
  savedId,
  onSaved,
  onExit,
  onUseAsNewIdea,
}: StoryboardResultProps) {
  const [frames, setFrames] = useState<Frame[]>(storyboard.frames);
  const [titleOptions, setTitleOptions] = useState<TitleOption[]>(storyboard.titleOptions);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(
    mode === "revisit" ? 0 : null,
  );
  const [activeRegen, setActiveRegen] = useState<ActiveRegen | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createJob = useCreateJob();
  const regenJob = useGenerationJob(activeJobId);

  useEffect(() => {
    if (!activeJobId || !regenJob.data || !activeRegen) return;
    if (regenJob.data.status === "done") {
      if (activeRegen.type === "titles") {
        const parsed = titlesOutputSchema.safeParse(regenJob.data.output);
        if (parsed.success) {
          setTitleOptions((current) =>
            mergeFreshTitles(current, selectedTitleIndex, parsed.data.titleOptions),
          );
        }
      } else {
        const parsed = storyboardOutputSchema.safeParse(regenJob.data.output);
        const nextFrame = parsed.success ? parsed.data.frames[activeRegen.index] : undefined;
        if (nextFrame) {
          const frameIndex = activeRegen.index;
          setFrames((current) =>
            current.map((f, i) => (i === frameIndex ? nextFrame : f)),
          );
        }
      }
      setActiveJobId(null);
      setActiveRegen(null);
    } else if (regenJob.data.status === "error") {
      setActiveJobId(null);
      setActiveRegen(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenJob.data, activeJobId]);

  const regenBusy = activeJobId !== null;

  function handleFreshTitles() {
    if (regenBusy) return;
    setActiveRegen({ type: "titles" });
    createJob.mutate(
      { kind: "titles", input: { idea, previousTitles: titleOptions.map((t) => t.title) } },
      {
        onSuccess: (result) => setActiveJobId(result.id),
        onError: () => setActiveRegen(null),
      },
    );
  }

  function handleRegenerateFrame(index: number) {
    if (regenBusy) return;
    setActiveRegen({ type: "frame", index });
    createJob.mutate(
      {
        kind: "storyboard",
        input: { idea, answers, existingFrames: frames, regenerateFrameIndex: index },
      },
      {
        onSuccess: (result) => setActiveJobId(result.id),
        onError: () => setActiveRegen(null),
      },
    );
  }

  // ---- Save (creation mode only) ----
  const saveStoryboard = useSaveStoryboard();
  const [saved, setSaved] = useState(false);
  const [savedIdResult, setSavedIdResult] = useState<string | null>(savedId ?? null);

  function handleSave() {
    if (selectedTitleIndex === null || saveStoryboard.isPending) return;
    const chosenTitle = titleOptions[selectedTitleIndex].title;
    saveStoryboard.mutate(
      {
        idea,
        answers,
        frames,
        titleOptions,
        chosenTitle,
        caption: storyboard.caption,
        hashtags: storyboard.hashtags,
        postingWindow: storyboard.postingWindow,
      },
      {
        onSuccess: (row) => {
          setSavedIdResult(row.id);
          setSaved(true);
        },
      },
    );
  }

  function handleViewInLibrary() {
    onExit();
    if (savedIdResult) onSaved?.(savedIdResult);
  }

  const isCreation = mode === "creation";

  return (
    <>
      <div className={shared.content}>
        <div className={shared.headlineRow}>
          <h1 className={shared.headline}>Your storyboard</h1>
          <span className={styles.frameCount}>{frames.length} frames</span>
        </div>

        {/* Read-then-decide order (design-crit F-01): frames first, title
            choice after — a title can only be judged once the storyboard has
            been read, and the Save gate sits below the titles it needs. */}
        <Staggered className={styles.frameList} itemClassName={styles.frameItem}>
          {frames.map((frame, index) => (
            <FrameCard
              key={index}
              frame={frame}
              index={index}
              total={frames.length}
              canRegenerate={isCreation}
              regenerateDisabled={regenBusy}
              isRegenerating={activeRegen?.type === "frame" && activeRegen.index === index}
              onRegenerate={() => handleRegenerateFrame(index)}
            />
          ))}
        </Staggered>

        <section aria-label="Pick a title" className={styles.titleSection}>
          <p className={styles.sectionEyebrow}>Pick a title</p>
          <div
            role="radiogroup"
            aria-label="Pick a title"
            className={[styles.titleList, activeRegen?.type === "titles" ? styles.titlesPulsing : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <AnimatePresence initial={false}>
              {titleOptions.map((option, index) => (
                <motion.div
                  key={`slot-${index}-${option.title}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <TitleCard
                    option={option}
                    selected={index === selectedTitleIndex}
                    interactive={isCreation}
                    onSelect={() => setSelectedTitleIndex(index)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {isCreation ? (
            <TapScale
              as="button"
              className={styles.freshTitles}
              onClick={handleFreshTitles}
              disabled={regenBusy}
              ariaLabel="Fresh titles"
            >
              <ArrowsClockwise size={16} aria-hidden="true" />
              Fresh titles
            </TapScale>
          ) : null}
        </section>

        <div className={styles.captionCard}>
          <p className={styles.sectionEyebrowInCard}>Caption</p>
          <p className={styles.captionText}>{storyboard.caption}</p>
          <CopyRow text={storyboard.caption} label="Copy caption" />
        </div>

        <p className={styles.postingWindow}>
          <ArrowCircleUp size={16} weight="bold" aria-hidden="true" />
          {storyboard.postingWindow}
        </p>
      </div>

      <div className={styles.actionBar}>
        {isCreation ? (
          saved ? (
            <TapScale
              as="button"
              className={shared.pillButton}
              onClick={handleViewInLibrary}
              ariaLabel="Saved — view in library"
            >
              Saved ✓ — View in library
            </TapScale>
          ) : (
            <div className={styles.saveBlock} aria-live="polite">
              <TapScale
                as="div"
                className={styles.savePill}
                onClick={handleSave}
                disabled={selectedTitleIndex === null || saveStoryboard.isPending}
                ariaLabel="Save to library"
              >
                {saveStoryboard.isPending ? "Saving…" : "Save to library"}
              </TapScale>
              {selectedTitleIndex === null ? (
                <p className={styles.saveHint}>Pick a title first</p>
              ) : null}
              {saveStoryboard.isError ? (
                <p className={styles.saveError} role="alert">
                  Couldn&apos;t save — try again.
                </p>
              ) : null}
            </div>
          )
        ) : (
          <TapScale
            as="button"
            className={shared.pillButton}
            onClick={() => onUseAsNewIdea?.(idea)}
            ariaLabel="Use as new idea"
          >
            Use as new idea
          </TapScale>
        )}
      </div>
    </>
  );
}
