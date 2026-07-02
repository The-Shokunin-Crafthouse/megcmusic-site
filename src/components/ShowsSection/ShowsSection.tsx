"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { TribeEvent } from "@/lib/api/events";
import { ShowCard } from "../ShowCard/ShowCard";
import styles from "./ShowsSection.module.css";

const TABS = [
  { id: "up-next", label: "Up Next" },
  { id: "just-added", label: "Just Added" },
  { id: "past", label: "Past Shows" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Home caps each tab at 7 rows; /shows lifts the cap and shows everything. */
const MAX_ROWS = 7;

/** Entrance stagger wraps every 7 rows so a long list (or an appended page)
 *  cascades in waves instead of trailing one row a full second behind. Home's
 *  0–6 indices are unchanged by the wrap. */
const STAGGER = 7;

const EMPTY_COPY: Record<TabId, string> = {
  "up-next": "No upcoming shows right now — check back soon.",
  "just-added": "Nothing just added — the next dates land here first.",
  past: "No past shows on record yet.",
};

/** The newest past events sit on the tribe API's LAST page (it sorts ascending),
 *  so /shows renders that page reversed and walks toward page 1 on each "Show
 *  more". `nextApiPage` is the API page to request next, 0 when the archive is
 *  exhausted; `perPage` keeps the client request aligned with the build fetch. */
export interface PastPagination {
  nextApiPage: number;
  perPage: number;
}

export function ShowsSection({
  upcoming,
  justAdded,
  past,
  variant = "home",
  pastPagination,
}: {
  upcoming: TribeEvent[];
  justAdded: TribeEvent[];
  past: TribeEvent[];
  variant?: "home" | "page";
  pastPagination?: PastPagination;
}) {
  const isPage = variant === "page";
  const [active, setActive] = useState<TabId>("up-next");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  // On /shows the past tab grows as more pages load; on home it's a static prop.
  const [pastRows, setPastRows] = useState<TribeEvent[]>(past);
  const [nextApiPage, setNextApiPage] = useState(pastPagination?.nextApiPage ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const cap = (list: TribeEvent[]) => (isPage ? list : list.slice(0, MAX_ROWS));
  const lists: Record<TabId, TribeEvent[]> = {
    "up-next": cap(upcoming),
    "just-added": cap(justAdded),
    past: isPage ? pastRows : cap(past),
  };
  const events = lists[active];

  const canLoadMore = isPage && active === "past" && nextApiPage > 0;

  async function loadMorePast() {
    if (!pastPagination || nextApiPage < 1) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/shows/past?apiPage=${nextApiPage}&perPage=${pastPagination.perPage}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { events: TribeEvent[]; nextApiPage: number };
      setPastRows((prev) => [...prev, ...data.events]);
      setNextApiPage(data.nextApiPage);
    } catch {
      // Keep nextApiPage so the button stays available for a retry.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  // APG tablist keyboard model: arrows move and activate, wrapping at the ends.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = TABS.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (event.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      className={isPage ? `${styles.section} ${styles.sectionPage}` : styles.section}
      aria-labelledby={`${baseId}-heading`}
    >
      <h2 id={`${baseId}-heading`} className={styles.heading}>
        Shows
      </h2>

      <div className={styles.inner}>
        <div role="tablist" aria-label="Show dates" className={styles.tabs}>
          {TABS.map((tab, i) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={selected ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                onClick={() => setActive(tab.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className={styles.panel}
        >
          {events.length > 0 ? (
            // Re-keying on the active tab remounts the list so the entrance
            // animation replays each time you switch. Appended past rows mount
            // into the same list, so only the new rows animate in.
            <div className={styles.clip}>
              <ul key={active} className={styles.list}>
                {events.map((event, i) => (
                  <ShowCard key={event.id} event={event} index={i % STAGGER} />
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.empty}>{EMPTY_COPY[active]}</p>
          )}

          <div className={styles.actions}>
            {isPage ? (
              canLoadMore && (
                <button
                  type="button"
                  className={styles.showMore}
                  onClick={loadMorePast}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading…"
                    : loadError
                      ? "Try again"
                      : "Show more"}
                </button>
              )
            ) : (
              <Link className={styles.seeAll} href="/shows">
                See all shows
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
