"use client";

/**
 * Screen 8 — Storyboard library (specs.md §"Screen 8"), the browse-surface
 * list rendered inside `LibraryTakeover`. Not a tab — reached only via
 * Home's "Storyboard library →" row or a post-save confirmation.
 *
 * Meta row: "N frames / <date> / <posting window first clause>" per the
 * spec — the list route selects `posting_window` (superset extension,
 * studio learning #60); rows saved without one just show the two fields.
 *
 * Drafts sit above the saved list in their own section. A draft is not a
 * storyboard — it has no frames, no title and no row in `storyboards` — so
 * it cannot be folded into that list without lying about what it is; and
 * leaving it out entirely made an unfinished idea reachable only by
 * re-opening the creation flow and noticing a row there. The store models
 * exactly one draft at a time, so this section is one row or nothing.
 */

import { TapScale } from "../motion/TapScale";
import { Staggered } from "../motion/Staggered";
import { StarDivider } from "../screens/shared/StarDivider";
import { usePlaybookStore, hasResumableDraft } from "../store";
import { useStoryboardsList, type StoryboardListItem } from "../useStoryboards";
import styles from "./LibraryScreen.module.css";

export interface LibraryScreenProps {
  onOpen: (id: string) => void;
  onStartIdea: () => void;
  /** Re-enters the creation flow where the saved draft left off. */
  onResumeDraft: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RowSkeleton() {
  return <div className={styles.rowSkeleton} aria-hidden="true" />;
}

interface LibraryRowProps {
  item: StoryboardListItem;
  onOpen: () => void;
}

function LibraryRow({ item, onOpen }: LibraryRowProps) {
  const title = item.chosen_title?.trim() || item.idea;
  return (
    <TapScale
      as="div"
      className={styles.row}
      onClick={onOpen}
      ariaLabel={`${title} — open storyboard`}
    >
      <p className={styles.rowTitle}>{title}</p>
      <p className={styles.rowMeta}>
        <span>{item.frames.length} frames</span>
        <span className={styles.slash}> / </span>
        <span>{formatDate(item.created_at)}</span>
        {item.posting_window ? (
          <>
            <span className={styles.slash}> / </span>
            {/* First clause only — the stored window can run to a sentence. */}
            <span>{item.posting_window.split(/[,—]/)[0].trim()}</span>
          </>
        ) : null}
      </p>
    </TapScale>
  );
}

function DraftRow({ onResume }: { onResume: () => void }) {
  const ideaDraft = usePlaybookStore((s) => s.ideaDraft);
  const questions = usePlaybookStore((s) => s.questions);
  const questionIndex = usePlaybookStore((s) => s.questionIndex);
  const draftPhase = usePlaybookStore((s) => s.draftPhase);
  const draftSavedAt = usePlaybookStore((s) => s.draftSavedAt);

  const resumable = hasResumableDraft({
    ideaDraft,
    questions,
    questionIndex,
    draftPhase,
    draftSavedAt,
    answers: {},
  });
  if (!resumable) return null;

  const title = ideaDraft.trim() || "Untitled idea";
  const position =
    draftPhase === "questions" && questions.length > 0
      ? `question ${Math.min(questionIndex, questions.length - 1) + 1} of ${questions.length}`
      : "not started yet";

  return (
    <div className={styles.section}>
      <p className={styles.eyebrow}>Drafts</p>
      <TapScale
        as="div"
        className={styles.row}
        onClick={onResume}
        ariaLabel={`${title} — pick up where you left off`}
      >
        <p className={styles.rowTitle}>{title}</p>
        <p className={styles.rowMeta}>
          <span>In progress</span>
          <span className={styles.slash}> / </span>
          <span>{position}</span>
          {draftSavedAt ? (
            <>
              <span className={styles.slash}> / </span>
              <span>{formatDate(draftSavedAt)}</span>
            </>
          ) : null}
        </p>
      </TapScale>
    </div>
  );
}

export function LibraryScreen({ onOpen, onStartIdea, onResumeDraft }: LibraryScreenProps) {
  const listQuery = useStoryboardsList();
  const items = listQuery.data ?? [];

  return (
    <div className={styles.stack}>
      <DraftRow onResume={onResumeDraft} />

      <p className={styles.eyebrow}>Storyboards</p>

      {listQuery.isLoading ? (
        <div className={styles.rows} aria-hidden="true">
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : null}

      {listQuery.isError ? (
        <div className={styles.stateBlock} role="status" aria-live="polite">
          <p className={styles.errorText}>Couldn&apos;t load the library.</p>
          <TapScale
            as="button"
            className={styles.retryText}
            onClick={() => listQuery.refetch()}
          >
            Retry
          </TapScale>
        </div>
      ) : null}

      {listQuery.isSuccess && items.length === 0 ? (
        <div className={styles.stateBlock}>
          <StarDivider />
          <p className={styles.emptyText}>
            Nothing saved yet. Your first storyboard lands here.
          </p>
          <TapScale
            as="button"
            className={styles.outlinePill}
            onClick={onStartIdea}
            ariaLabel="Start an idea"
          >
            Start an idea
          </TapScale>
        </div>
      ) : null}

      {listQuery.isSuccess && items.length > 0 ? (
        <Staggered className={styles.rows} itemClassName={styles.rowItem}>
          {items.map((item) => (
            <LibraryRow key={item.id} item={item} onOpen={() => onOpen(item.id)} />
          ))}
        </Staggered>
      ) : null}
    </div>
  );
}
