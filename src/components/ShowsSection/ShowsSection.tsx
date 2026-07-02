"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { TribeEvent } from "@/lib/api/events";
import { ShowCard } from "../ShowCard/ShowCard";
import styles from "./ShowsSection.module.css";

const TABS = [
  { id: "up-next", label: "Up Next" },
  { id: "just-added", label: "Just Added" },
  { id: "past", label: "Past Shows" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Home caps each tab at 7 rows; /shows paginates instead. */
const MAX_ROWS = 7;

/** Entrance stagger wraps every 7 rows so a full page cascades in waves instead
 *  of trailing the last row a second behind. Home's 0–6 indices are unchanged. */
const STAGGER = 7;

/** Page-size choices for the /shows archive. */
const PAGE_SIZES = [20, 50, 100] as const;

const EMPTY_COPY: Record<TabId, string> = {
  "up-next": "No upcoming shows right now — check back soon.",
  "just-added": "Nothing just added — the next dates land here first.",
  past: "No past shows on record yet.",
};

function matchesQuery(event: TribeEvent, q: string): boolean {
  const haystack = [
    event.title,
    event.venue?.venue,
    event.venue?.city,
    event.venue?.state_province,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Page numbers to render, with 0 marking an ellipsis gap. Always keeps the
 *  first, last, and the current page's neighbours. */
function pageWindow(current: number, total: number): number[] {
  const keep = new Set([1, total, current, current - 1, current + 1]);
  const shown = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: number[] = [];
  let prev = 0;
  for (const p of shown) {
    if (p - prev > 1) out.push(0);
    out.push(p);
    prev = p;
  }
  return out;
}

export function ShowsSection({
  upcoming,
  justAdded,
  past,
  variant = "home",
}: {
  upcoming: TribeEvent[];
  justAdded: TribeEvent[];
  past: TribeEvent[];
  variant?: "home" | "page";
}) {
  const isPage = variant === "page";
  const [active, setActive] = useState<TabId>("up-next");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const source: Record<TabId, TribeEvent[]> = {
    "up-next": upcoming,
    "just-added": justAdded,
    past,
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = source[active];
    return q ? list.filter((e) => matchesQuery(e, q)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, q, upcoming, justAdded, past]);

  // Home shows a fixed cap with no controls; /shows paginates the filtered list.
  const pageCount = isPage ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const current = Math.min(page, pageCount);
  const events = isPage
    ? filtered.slice((current - 1) * pageSize, current * pageSize)
    : filtered.slice(0, MAX_ROWS);

  const searching = q.length > 0;

  function selectTab(id: TabId) {
    setActive(id);
    setPage(1);
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
    selectTab(TABS[next].id);
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
                onClick={() => selectTab(tab.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {isPage && (
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <label htmlFor={`${baseId}-search`} className={styles.srOnly}>
                Search shows
              </label>
              <input
                id={`${baseId}-search`}
                type="search"
                inputMode="search"
                placeholder="Search by show, venue, or city"
                className={styles.searchInput}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className={styles.pageSize}>
              <label htmlFor={`${baseId}-page-size`} className={styles.pageSizeLabel}>
                Per page
              </label>
              <select
                id={`${baseId}-page-size`}
                className={styles.select}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className={styles.panel}
        >
          {events.length > 0 ? (
            // Re-key on tab + page + query so the entrance animation replays
            // whenever the visible set changes.
            <div className={styles.clip}>
              <ul key={`${active}-${current}-${q}`} className={styles.list}>
                {events.map((event, i) => (
                  <ShowCard
                    key={event.id}
                    event={event}
                    index={i % STAGGER}
                    withCalendar={isPage}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.empty}>
              {searching
                ? `No shows match “${query.trim()}”.`
                : EMPTY_COPY[active]}
            </p>
          )}

          {isPage && pageCount > 1 && (
            <nav className={styles.pagination} aria-label="Show pages">
              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => setPage(current - 1)}
                disabled={current <= 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {pageWindow(current, pageCount).map((p, i) =>
                p === 0 ? (
                  <span key={`gap-${i}`} className={styles.pageGap} aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={
                      p === current
                        ? `${styles.pageNum} ${styles.pageNumActive}`
                        : styles.pageNum
                    }
                    aria-current={p === current ? "page" : undefined}
                    aria-label={`Page ${p}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => setPage(current + 1)}
                disabled={current >= pageCount}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          )}

          {!isPage && (
            <div className={styles.actions}>
              <Link className={styles.seeAll} href="/shows">
                See all shows
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
