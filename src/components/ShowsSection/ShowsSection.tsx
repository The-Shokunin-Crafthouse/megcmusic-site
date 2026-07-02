"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { TribeEvent } from "@/lib/api/events";
import { ShowCard } from "../ShowCard/ShowCard";
import styles from "./ShowsSection.module.css";

const TABS = [
  { id: "up-next", label: "Up Next" },
  { id: "just-added", label: "Just Added" },
  { id: "past", label: "Past Shows" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Home caps each tab at 7 rows; /shows lazy-loads in batches of this size. */
const MAX_ROWS = 7;
const BATCH = 20;

/** Entrance stagger wraps every 7 rows so a batch cascades in waves instead of
 *  trailing the last row a second behind. Home's 0–6 indices are unchanged. */
const STAGGER = 7;

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
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

  // Reset the lazy window whenever the visible set changes at its root.
  useEffect(() => {
    setVisibleCount(BATCH);
  }, [active, q]);

  const events = isPage
    ? filtered.slice(0, visibleCount)
    : filtered.slice(0, MAX_ROWS);
  const hasMore = isPage && visibleCount < filtered.length;

  // Lazy load: reveal the next batch as the sentinel scrolls into view.
  useEffect(() => {
    if (!isPage || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + BATCH);
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isPage, hasMore, filtered.length]);

  // Focus the field the moment search opens (rAF: it mounts this render).
  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => searchRef.current?.focus());
  }, [searchOpen]);

  function selectTab(id: TabId) {
    setActive(id);
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) setQuery("");
      return !open;
    });
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

  const searching = q.length > 0;

  const tablist = (
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
  );

  return (
    <section
      className={isPage ? `${styles.section} ${styles.sectionPage}` : styles.section}
      aria-labelledby={`${baseId}-heading`}
    >
      <h2 id={`${baseId}-heading`} className={styles.heading}>
        Shows
      </h2>

      <div className={styles.inner}>
        {isPage ? (
          <div className={styles.tabRow}>
            {tablist}
            <button
              type="button"
              className={styles.searchToggle}
              aria-expanded={searchOpen}
              aria-controls={`${baseId}-search`}
              aria-label={searchOpen ? "Close search" : "Search shows"}
              onClick={toggleSearch}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                {searchOpen ? (
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : (
                  <>
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        ) : (
          tablist
        )}

        {isPage && searchOpen && (
          <div className={styles.searchReveal}>
            <label htmlFor={`${baseId}-search`} className={styles.srOnly}>
              Search shows
            </label>
            <input
              ref={searchRef}
              id={`${baseId}-search`}
              type="search"
              inputMode="search"
              placeholder="Search by show, venue, or city"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className={styles.panel}
        >
          {events.length > 0 ? (
            // Re-key on tab + query so the entrance animation replays when the
            // set changes; lazily appended rows mount into the same list, so
            // only the new rows animate in.
            <div className={styles.clip}>
              <ul key={`${active}-${q}`} className={styles.list}>
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
              {searching ? `No shows match “${query.trim()}”.` : EMPTY_COPY[active]}
            </p>
          )}

          {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />}

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
