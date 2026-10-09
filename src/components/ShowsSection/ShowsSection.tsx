"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { TribeEvent } from "@/lib/api/events";
import {
  fetchAllEventsBrowser,
  fetchUpcomingBrowser,
} from "@/lib/api/events-browser";
import {
  HOME_ROWS,
  mergeRefresh,
  refreshWindowStart,
  splitShows,
} from "@/lib/show-split";
import { ShowCard } from "../ShowCard/ShowCard";
import styles from "./ShowsSection.module.css";

const TABS = [
  { id: "up-next", label: "Up Next" },
  { id: "just-added", label: "Just Added" },
  { id: "past", label: "Past Shows" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Home caps each tab at HOME_ROWS; /shows lazy-loads in batches of this size. */
const BATCH = 20;

/** Skeleton rows while the browser fallback fetches — matches the hero's
 *  ~2.5-visible-row framing so the loading state fills the same silhouette
 *  the real cards will. */
const SKELETON_ROWS = 3;

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
  events: serverEvents,
  splitAt,
  variant = "home",
  forceFallback = false,
  onFallbackSettled,
}: {
  /** Every show the server fetched, past and upcoming, unsplit. */
  events: TribeEvent[];
  /** Server render time (epoch ms). The first client render splits against it
   *  so hydration matches; the mount effect re-splits against the real clock,
   *  so a cached page never shows an ended show as upcoming (or hides one
   *  mid-set). */
  splitAt: number;
  variant?: "home" | "page";
  /** Dev-only (home boot veil preview): run the browser fallback even though
   *  the server render has data. */
  forceFallback?: boolean;
  /** Home boot veil: called once when the browser fallback settles (resolved
   *  or failed), so the veil knows it can exit. */
  onFallbackSettled?: () => void;
}) {
  const isPage = variant === "page";
  const [active, setActive] = useState<TabId>("up-next");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOn, setCalendarOn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  // The WP host blocks datacenter IPs, so the server render is empty on Vercel.
  // When that happens, refetch from the visitor's browser (residential IP,
  // CORS-allowed) and use that instead.
  const serverEmpty = serverEvents.length === 0;
  const shouldFallback = serverEmpty || forceFallback;
  const [browserEvents, setBrowserEvents] = useState<TribeEvent[] | null>(null);
  const [loading, setLoading] = useState(serverEmpty);
  const [now, setNow] = useState(splitAt);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  // On the veiled home path the entrance animations (tabs / cards / skeletons)
  // are held at their first frame until the veil's exit flips the body to
  // "entered" — otherwise they'd play out invisibly under the veil before
  // hydration. Latched once from the initial render; home-only (the veil never
  // mounts on /shows, whose section has no body[data-home] to release it).
  const [entranceHeld] = useState(serverEmpty && variant === "home");

  // Ref so the fetch effect doesn't re-run if the parent re-creates the
  // callback.
  const onSettledRef = useRef(onFallbackSettled);
  onSettledRef.current = onFallbackSettled;

  useEffect(() => {
    if (!shouldFallback) return;
    let alive = true;
    (async () => {
      try {
        const all = await fetchAllEventsBrowser();
        if (alive) setBrowserEvents(all);
      } catch {
        // Leave the empty state; nothing more we can do from here.
      } finally {
        if (alive) {
          setLoading(false);
          onSettledRef.current?.();
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [shouldFallback]);

  // The server rendered the build's archive. Refresh it from a few days back
  // with one browser request, so a show Meg added, moved or cancelled since the
  // build shows up. The list is already on screen; a failed refresh keeps it.
  useEffect(() => {
    if (shouldFallback) return;
    let alive = true;
    const windowStart = refreshWindowStart(Date.now());
    fetchUpcomingBrowser(windowStart)
      .then((fresh) => {
        if (alive) setBrowserEvents(mergeRefresh(serverEvents, fresh, windowStart));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [shouldFallback, serverEvents]);

  const allEvents = browserEvents ?? serverEvents;
  const data = useMemo(() => splitShows(allEvents, now), [allEvents, now]);
  const source: Record<TabId, TribeEvent[]> = {
    "up-next": data.upcoming,
    "just-added": data.justAdded,
    past: data.past,
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = source[active];
    return q ? list.filter((e) => matchesQuery(e, q)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, q, data]);

  // Reset the lazy window whenever the visible set changes at its root.
  useEffect(() => {
    setVisibleCount(BATCH);
  }, [active, q]);

  const events = isPage
    ? filtered.slice(0, visibleCount)
    : filtered.slice(0, HOME_ROWS);
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
            style={{ "--col-index": i } as CSSProperties}
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
      className={[
        styles.section,
        isPage ? styles.sectionPage : styles.sectionHome,
        entranceHeld ? styles.held : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={`${baseId}-heading`}
    >
      <h2 id={`${baseId}-heading`} className={styles.heading}>
        Shows
      </h2>

      <div className={styles.inner}>
        <div className={styles.tabRow}>
          {tablist}
          <div className={styles.controls}>
            {!isPage && (
              <button
                type="button"
                className={
                  calendarOn ? `${styles.tab} ${styles.tabActive}` : styles.tab
                }
                style={{ "--col-index": TABS.length } as CSSProperties}
                aria-pressed={calendarOn}
                onClick={() => setCalendarOn((on) => !on)}
              >
                Add To Calendar
              </button>
            )}
            <button
              type="button"
              className={styles.searchToggle}
              style={{ "--col-index": TABS.length + 1 } as CSSProperties}
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
        </div>

        {searchOpen && (
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
                    withCalendar={isPage || calendarOn}
                    entranceHeld={entranceHeld}
                  />
                ))}
              </ul>
            </div>
          ) : loading ? (
            // Skeleton show-card shapes (same geometry, cascade, and tokens as
            // the real cards) so the loading state reads as part of the
            // entrance choreography, not a broken state mid-reveal — and the
            // swap to real data doesn't look like a state change. See
            // decisions.md (2026-07-08).
            <div className={styles.clip} role="status">
              <span className={styles.srOnly}>Loading shows…</span>
              <ul className={styles.list} aria-hidden="true">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <li
                    key={i}
                    className={styles.skeletonCard}
                    style={{ "--row-index": i } as CSSProperties}
                  >
                    <span className={styles.skeletonBadge} />
                    <span className={styles.skeletonBody}>
                      <span className={styles.skeletonTitle} />
                      <span className={styles.skeletonMeta} />
                    </span>
                  </li>
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
                See all dates
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
