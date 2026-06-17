"use client";

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

/** Most rows shown per tab before "See all shows" takes over. */
const MAX_ROWS = 7;

/** Her live listing on the WordPress site (The Events Calendar archive). */
const ALL_SHOWS_URL = "https://www.megcmusic.com/events/";

const EMPTY_COPY: Record<TabId, string> = {
  "up-next": "No upcoming shows right now — check back soon.",
  "just-added": "Nothing just added — the next dates land here first.",
  past: "No past shows on record yet.",
};

export function ShowsSection({
  upcoming,
  justAdded,
  past,
}: {
  upcoming: TribeEvent[];
  justAdded: TribeEvent[];
  past: TribeEvent[];
}) {
  const [active, setActive] = useState<TabId>("up-next");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const lists: Record<TabId, TribeEvent[]> = { "up-next": upcoming, "just-added": justAdded, past };
  const events = lists[active].slice(0, MAX_ROWS);

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
    <section className={styles.section} aria-labelledby={`${baseId}-heading`}>
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
            // animation replays each time you switch.
            <div className={styles.clip}>
              <ul key={active} className={styles.list}>
                {events.map((event, i) => (
                  <ShowCard key={event.id} event={event} index={i} />
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.empty}>{EMPTY_COPY[active]}</p>
          )}

          <div className={styles.actions}>
            <a
              className={styles.seeAll}
              href={ALL_SHOWS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              See all shows
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
