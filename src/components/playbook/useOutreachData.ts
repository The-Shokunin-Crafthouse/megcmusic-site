"use client";

/**
 * Client fetch of GET /api/outreach/summary for the Booking screen —
 * page-facing, unguarded (same posture as the route itself). The route
 * returns the UI-shaped `OutreachSummary` (templates + needsAction +
 * pipeline buckets); this hook flattens the five pipeline buckets into one
 * `prospects` array since Booking filters/lists across all of them
 * client-side (New / Replied / Category), not bucket-by-bucket.
 *
 * `updateProspect` applies an optimistic local patch to whichever bucket
 * currently holds the row (VenueSheet's "Mark handled" uses this, with the
 * caller responsible for rolling back on a failed PATCH).
 */

import { useCallback, useEffect, useState } from "react";
import type { OutreachSummary, Prospect } from "@/lib/outreach/types";

export type OutreachStatus = "loading" | "ready" | "error";

interface UseOutreachDataResult {
  prospects: Prospect[];
  status: OutreachStatus;
  error: string | null;
  refetch: () => void;
  /** Optimistic local patch — does not itself call the API. */
  updateProspect: (id: string, patch: Partial<Prospect>) => void;
}

const BUCKET_KEYS = [
  "new",
  "in_sequence",
  "replied_positive",
  "replied_negative",
  "cooling",
] as const;

export function useOutreachData(): UseOutreachDataResult {
  const [summary, setSummary] = useState<OutreachSummary | null>(null);
  const [status, setStatus] = useState<OutreachStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetch("/api/outreach/summary")
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (json as { error?: string } | null)?.error ??
              "Couldn't reach the playbook.",
          );
        }
        return json as OutreachSummary;
      })
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't reach the playbook.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const updateProspect = useCallback(
    (id: string, patch: Partial<Prospect>) => {
      setSummary((prev) => {
        if (!prev) return prev;
        const nextPipeline = { ...prev.pipeline };
        for (const key of BUCKET_KEYS) {
          nextPipeline[key] = prev.pipeline[key].map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          );
        }
        return { ...prev, pipeline: nextPipeline };
      });
    },
    [],
  );

  const prospects: Prospect[] = summary
    ? BUCKET_KEYS.flatMap((key) => summary.pipeline[key])
    : [];

  return { prospects, status, error, refetch, updateProspect };
}
