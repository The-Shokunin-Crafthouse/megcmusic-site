"use client";

/**
 * Data hooks for the generation-job queue (Sprint 10 P3). Server-proxied
 * polling only — no client-side Supabase, per the ADR in PLAN.md
 * ("Resolved conflict"): the brief's Realtime suggestion would require
 * shipping anon Supabase credentials + public RLS select on
 * `generation_jobs` from an unauthenticated route, which the repo's
 * zero-client-Supabase posture forbids. Polling `GET
 * /api/playbook/jobs/[id]` every 2.5s (well under the brief's own 2-minute
 * cap) is the sanctioned fallback and is used unconditionally.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  JobKind,
  JobStatus,
  PageCreatableKind,
} from "@/lib/playbook/generation";

export interface GenerationJobView {
  id: string;
  kind: JobKind;
  status: JobStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const TERMINAL_STATUSES: JobStatus[] = ["done", "error"];

async function fetchJob(id: string): Promise<GenerationJobView> {
  const res = await fetch(`/api/playbook/jobs/${id}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Failed to load job ${id}.`;
    throw new Error(message);
  }
  return body as GenerationJobView;
}

/** Polls a generation job's status every 2.5s while it is active
 *  (`queued`/`running`/`streaming`), and stops polling once it lands on a
 *  terminal status (`done`/`error`). Disabled entirely when `id` is null —
 *  the caller passes `null` before a job exists. */
export function useGenerationJob(id: string | null) {
  return useQuery({
    queryKey: ["playbook", "job", id],
    queryFn: () => fetchJob(id as string),
    enabled: id !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.includes(status)) return false;
      return 2500;
    },
    // A polled resource has no useful "stale" window of its own — every
    // fetch is the point.
    staleTime: 0,
  });
}

interface CreateJobInput {
  kind: PageCreatableKind;
  input: Record<string, unknown>;
}

interface CreateJobResult {
  id: string;
  status: JobStatus;
}

async function postJob(body: CreateJobInput): Promise<CreateJobResult> {
  const res = await fetch("/api/playbook/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "Failed to enqueue job.";
    throw new Error(message);
  }
  return data as CreateJobResult;
}

/** Enqueues a generation job (`questions` | `storyboard` | `make_it_better`
 *  | `titles` — the four page-creatable kinds). On success, seeds the
 *  react-query cache for that job id so the first `useGenerationJob` poll
 *  has an immediate value instead of a loading flash. */
export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postJob,
    onSuccess: (result) => {
      queryClient.setQueryData<GenerationJobView>(
        ["playbook", "job", result.id],
        (prev) =>
          prev ?? {
            id: result.id,
            kind: "questions", // overwritten by the first poll response
            status: result.status,
            output: null,
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
      );
    },
  });
}
