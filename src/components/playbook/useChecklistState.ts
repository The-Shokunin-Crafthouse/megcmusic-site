"use client";

/**
 * Per-day checklist check-state for the Checklist screen — GET on mount,
 * PUT on toggle (optimistic, rollback on error). Offline-safe per spec
 * §10: a failed GET renders everything unchecked with a quiet error line
 * rather than blocking the screen; a failed PUT reverts the just-toggled
 * item and surfaces the same quiet line (no retry queue — "toggles
 * queue-less" per the sprint brief).
 *
 * `date` is always the caller's-local "today" in America/Denver
 * (`YYYY-MM-DD`), matching the studio's date-string discipline (learning
 * #48 — never hand a bare/derived value to `new Date()`; here we only ever
 * format via `Intl.DateTimeFormat`, never parse).
 */

import { useCallback, useEffect, useState } from "react";

export type ChecklistLoadStatus = "loading" | "ready" | "error";

interface UseChecklistStateResult {
  items: Record<string, boolean>;
  status: ChecklistLoadStatus;
  /** Set on a load failure or a reverted toggle; cleared on the next
   *  successful request. Non-blocking — the checklist stays interactive. */
  error: string | null;
  toggle: (itemId: string) => void;
}

/** Today's date in America/Denver as YYYY-MM-DD (en-CA formats ISO order). */
export function todayInDenver(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function useChecklistState(): UseChecklistStateResult {
  const [items, setItems] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<ChecklistLoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const date = todayInDenver();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetch(`/api/playbook/checklist?date=${date}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          // The server's error string is for the console, not for Meghan —
          // a raw PostgREST message on screen reads as breakage. The UI
          // always gets the same quiet line.
          console.error(
            "checklist load failed:",
            (json as { error?: string } | null)?.error ?? res.status,
          );
          throw new Error("Couldn't load today's check-offs — showing unchecked.");
        }
        return json as { items: Record<string, boolean> };
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? {});
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setItems({});
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load today's check-offs — showing unchecked.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // `date` is stable for the component's lifetime (one calendar day per
    // mount) — re-running on every render would re-fire the fetch for no
    // reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    (itemId: string) => {
      setItems((prev) => {
        const nextChecked = !prev[itemId];
        const optimistic = { ...prev, [itemId]: nextChecked };

        fetch("/api/playbook/checklist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, itemId, checked: nextChecked }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const json = await res.json().catch(() => null);
              console.error(
                "checklist save failed:",
                (json as { error?: string } | null)?.error ?? res.status,
              );
              throw new Error("Couldn't save that check — it's unchecked again.");
            }
            setError(null);
          })
          .catch((err) => {
            // Roll back just this item; leave any other optimistic state alone.
            setItems((cur) => ({ ...cur, [itemId]: !nextChecked }));
            setError(
              err instanceof Error ? err.message : "Couldn't save that check.",
            );
          });

        return optimistic;
      });
    },
    [date],
  );

  return { items, status, error, toggle };
}
