import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { TribeEvent } from "@/lib/api/events";
import { parseShowDate, formatTimeRange } from "@/lib/datetime";
import styles from "./ShowCard.module.css";

/** Guitar-pick silhouette behind the date badge — the exact Figma vector
 *  (node 39:24), inlined so it tints from a token and ships no asset file.
 *  Sized and rotated (-96.04°) in CSS to frame the date, per Figma 39:23. */
function GuitarPick() {
  return (
    <span className={styles.pickWrap} aria-hidden="true">
      <svg
        className={styles.pick}
        viewBox="0 0 62.8615 71.0589"
        fill="none"
        focusable="false"
      >
        <path
          d="M49.72 2.12833H49.6253C49.3574 2.0652 48.4901 1.84451 47.15 1.58431L47.1503 1.58457C41.9714 0.567386 36.7085 0.0369192 31.4314 0C26.1542 0.0343861 20.8917 0.562236 15.7125 1.57662C14.3725 1.83682 13.5051 2.05751 13.2372 2.12063H13.1425H13.1428C8.7729 3.43527 5.04485 6.32187 2.67795 10.2231C0.310987 14.1247 -0.527381 18.7645 0.324848 23.2473C0.324848 23.3892 0.372065 23.5232 0.403627 23.6495C5.81143 51.4689 24.652 67.9052 25.9133 68.9221L25.9765 68.9773C27.4833 70.3181 29.4302 71.0589 31.4471 71.0589C33.4644 71.0589 35.4113 70.3181 36.9181 68.9773L36.9812 68.9221C38.2109 67.9052 57.0516 51.4689 62.4594 23.6495C62.4594 23.5232 62.5146 23.3892 62.5382 23.2473C63.3881 18.7656 62.5487 14.1279 60.182 10.2284C57.8153 6.32896 54.0885 3.44368 49.7204 2.12852L49.72 2.12833Z"
          fill="var(--mc-text-card)"
        />
      </svg>
    </span>
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
