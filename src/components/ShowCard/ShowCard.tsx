import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { TribeEvent } from "@/lib/api/events";
import { parseShowDate, formatTimeRange } from "@/lib/datetime";
import styles from "./ShowCard.module.css";

/** Guitar-pick silhouette behind the date badge (Figma 39:24, rotated in CSS).
 *  Hand-authored inline SVG so it tints from a token and ships no asset file. */
function GuitarPick() {
  return (
    <svg
      className={styles.pick}
      viewBox="0 0 63 71"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M31.5 2C18 2 4 9 4 23c0 7 4 17 10 28 6 11 12 18 17.5 18S43 62 49 51c6-11 10-21 10-28C59 9 45 2 31.5 2Z"
        fill="var(--mc-text-card)"
      />
    </svg>
  );
}

/** Google Maps directions link for a venue, or null when there's no venue. */
function directionsHref(venue: TribeEvent["venue"]): string | null {
  const name = venue?.venue;
  if (!name) return null;
  const destination = [name, venue?.address, venue?.city, venue?.state_province]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function ShowCard({ event, index }: { event: TribeEvent; index: number }) {
  const date = parseShowDate(event.start_date);
  const time = formatTimeRange(event.start_date, event.end_date);
  const maps = directionsHref(event.venue);
  const city = [event.venue?.city, event.venue?.state_province]
    .filter(Boolean)
    .join(", ");

  // Time · venue · city, joined by dividers — only the parts that exist (studio
  // appearances carry no venue), so a missing field never leaves a stray rule.
  const segments: ReactNode[] = [];
  if (time) segments.push(<span className={styles.time}>{time}</span>);
  if (event.venue?.venue) {
    segments.push(
      maps ? (
        <a
          className={styles.venue}
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
        >
          {event.venue.venue}
        </a>
      ) : (
        <span className={styles.venue}>{event.venue.venue}</span>
      ),
    );
  }
  if (city) segments.push(<span className={styles.city}>{city}</span>);

  return (
    <li className={styles.card} style={{ "--row-index": index } as CSSProperties}>
      <div className={styles.badge}>
        <GuitarPick />
        {date && (
          <>
            <span className={styles.month}>{date.month}</span>
            <span className={styles.day}>{date.day}</span>
          </>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <a
            className={styles.titleLink}
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {event.title}
          </a>
        </h3>

        {segments.length > 0 && (
          <div className={styles.meta}>
            {segments.map((segment, i) => (
              <Fragment key={i}>
                {i > 0 && <span className={styles.divider} aria-hidden="true" />}
                {segment}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
