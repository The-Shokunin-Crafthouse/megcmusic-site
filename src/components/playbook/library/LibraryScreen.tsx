"use client";

/**
 * Screen 8 — Storyboard library (specs.md §"Screen 8"), the browse-surface
 * list rendered inside `LibraryTakeover`. Not a tab — reached only via
 * Home's "Storyboard library →" row or a post-save confirmation.
 *
 * Meta row: "N frames / <date> / <posting window first clause>" per the
 * spec — the list route selects `posting_window` (superset extension,
 * studio learning #60); rows saved without one just show the two fields.
 */

import { TapScale } from "../motion/TapScale";
import { Staggered } from "../motion/Staggered";
import { StarDivider } from "../screens/shared/StarDivider";
import { useStoryboardsList, type StoryboardListItem } from "../useStoryboards";
import styles from "./LibraryScreen.module.css";

export interface LibraryScreenProps {
  onOpen: (id: string) => void;
  onStartIdea: () => void;
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

export function LibraryScreen({ onOpen, onStartIdea }: LibraryScreenProps) {
  const listQuery = useStoryboardsList();
  const items = listQuery.data ?? [];

  return (
    <div className={styles.stack}>
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
