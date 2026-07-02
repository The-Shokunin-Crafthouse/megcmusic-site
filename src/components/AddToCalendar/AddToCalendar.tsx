"use client";

import { useEffect } from "react";
import type { TribeEvent } from "@/lib/api/events";
import { calendarParts } from "@/lib/datetime";
import styles from "./AddToCalendar.module.css";

// Meghan is Colorado-based; fall back to Mountain time when a payload omits the
// zone so the calendar entry still lands at the venue's wall-clock time.
const DEFAULT_TZ = "America/Denver";
const OPTIONS = "'Apple','Google','iCal','Outlook.com','Yahoo'";

export function AddToCalendar({ event }: { event: TribeEvent }) {
  useEffect(() => {
    // The web component reads `window` on import, so register it client-side
    // only. The dynamic import is cached, so repeated cards share one load.
    import("add-to-calendar-button");
  }, []);

  const parts = calendarParts(event.start_date, event.end_date, event.all_day);
  if (!parts) return null;

  const location = [event.venue?.venue, event.venue?.city, event.venue?.state_province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={styles.wrap}>
      <add-to-calendar-button
        name={event.title}
        options={OPTIONS}
        startDate={parts.startDate}
        endDate={parts.endDate}
        startTime={parts.startTime}
        endTime={parts.endTime}
        timeZone={event.timezone || DEFAULT_TZ}
        location={location || undefined}
        label="Add to calendar"
        buttonStyle="text"
        size="0"
        lightMode="light"
        hideBackground="true"
        hideCheckmark="true"
      />
    </div>
  );
}
