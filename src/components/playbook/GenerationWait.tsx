"use client";

/**
 * Staged progress narrative for a polled generation job (Sprint 10 P3).
 * Never a bare spinner: `queued`/`running` show a quiet animated
 * equalizer + a stage label; `streaming` hands off to the caller's partial
 * results via `Staggered`; `error` is a friendly retry state, never a raw
 * error dump. P4 wires this to `useGenerationJob`'s live status; this
 * component only renders whatever status it's given.
 */

import type { JobStatus } from "@/lib/playbook/generation";
import type { ReactNode } from "react";
import { Staggered } from "./motion/Staggered";
import { TapScale } from "./motion/TapScale";
import styles from "./GenerationWait.module.css";

interface GenerationWaitProps {
  status: JobStatus;
  /** What this particular job is doing, e.g. "Finding the right questions".
   *  Shown while the job is still queued and then replaced by the live
   *  stage copy — one status line that updates, rather than a static
   *  caption above a second, separately-updating one. */
  label?: string;
  onRetry?: () => void;
  /** Partial/streamed results, rendered via `Staggered` once `status` is
   *  `"streaming"`. Ignored for every other status. */
  children?: ReactNode;
}

const STAGE_COPY: Partial<Record<JobStatus, string>> = {
  running: "Thinking it through…",
};

const BAR_COUNT = 4;

/** Four bars on a looping CSS animation — see the module CSS for why this
 *  is not a framer-motion keyframe loop. */
function Equalizer() {
  return (
    <div className={styles.equalizer} aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span key={index} className={styles.bar} />
      ))}
    </div>
  );
}

export function GenerationWait({
  status,
  label,
  onRetry,
  children,
}: GenerationWaitProps) {
  if (status === "error") {
    return (
      <div className={styles.wrap} role="status" aria-live="polite">
        <p className={styles.errorText}>
          That generation didn&apos;t finish. Nothing was lost — your draft
          is still here.
        </p>
        {onRetry ? (
          <TapScale
            as="button"
            className={styles.retryButton}
            onClick={onRetry}
            ariaLabel="Retry generation"
          >
            Try again
          </TapScale>
        ) : null}
      </div>
    );
  }

  if (status === "streaming") {
    return (
      <div className={styles.wrap} role="status" aria-live="polite">
        <Staggered>{children}</Staggered>
      </div>
    );
  }

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <Equalizer />
      <p className={styles.stageText}>
        {STAGE_COPY[status] ?? label ?? "Working on it…"}
      </p>
    </div>
  );
}
