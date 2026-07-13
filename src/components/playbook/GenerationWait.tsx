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
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Staggered } from "./motion/Staggered";
import { TapScale } from "./motion/TapScale";
import styles from "./GenerationWait.module.css";

interface GenerationWaitProps {
  status: JobStatus;
  onRetry?: () => void;
  /** Partial/streamed results, rendered via `Staggered` once `status` is
   *  `"streaming"`. Ignored for every other status. */
  children?: ReactNode;
}

const STAGE_COPY: Partial<Record<JobStatus, string>> = {
  queued: "Warming up…",
  running: "Thinking it through…",
};

const BAR_COUNT = 4;

function Equalizer() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.equalizer} aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <motion.span
          key={index}
          className={styles.bar}
          animate={
            reducedMotion ? { scaleY: 0.6 } : { scaleY: [0.3, 1, 0.3] }
          }
          transition={
            reducedMotion
              ? { duration: 0.001 }
              : {
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.12,
                }
          }
        />
      ))}
    </div>
  );
}

export function GenerationWait({
  status,
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
      <p className={styles.stageText}>{STAGE_COPY[status] ?? "Working on it…"}</p>
    </div>
  );
}
