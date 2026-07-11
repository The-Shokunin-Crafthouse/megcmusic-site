"use client";

/**
 * Performance tab orchestrator. Fetches /api/playbook/summary on mount and
 * renders the sync-health strip + top-5 posts list. Four states: loading
 * (skeleton, no spinner), error (retry), empty (written copy), populated —
 * same shape as Outreach.tsx.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { relativeTime } from "@/components/Outreach/relativeTime";
import type { PlaybookSummary } from "@/lib/playbook/types";
import { TopPosts } from "./TopPosts";
import styles from "./Performance.module.css";

type Status = "loading" | "error" | "ready";

export function Performance() {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<PlaybookSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const res = await fetch("/api/playbook/summary", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Summary failed (${res.status}).`);
      const data = (await res.json()) as PlaybookSummary;
      setSummary(data);
      setStatus("ready");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (status === "loading") return <PerformanceSkeleton />;

  if (status === "error") {
    return (
      <div className={styles.stateBox}>
        <p className={styles.stateText}>Couldn&apos;t load performance data.</p>
        <button type="button" className={styles.btnPrimary} onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={styles.root}>
      <SyncHealthStrip
        health={summary.health}
        lastSync={summary.lastSync}
      />

      <section className={styles.section} aria-labelledby="performance-top">
        <h3 className={styles.sectionTitle} id="performance-top">
          Top 5 all-time
        </h3>
        {summary.topPosts.length === 0 ? (
          <p className={styles.emptyLine}>
            No posts have reached 100+ accounts yet — the first sync populates
            this once the account has enough data.
          </p>
        ) : (
          <>
            <p className={styles.footnote}>
              Among posts that reached 100+ accounts. Rate = (likes + comments
              + saves + shares) ÷ reach.
            </p>
            <TopPosts posts={summary.topPosts} />
          </>
        )}
      </section>
    </div>
  );
}

function SyncHealthStrip({
  health,
  lastSync,
}: {
  health: PlaybookSummary["health"];
  lastSync: string | null;
}) {
  if (health === "auth_error") {
    return (
      <div className={styles.authBanner} role="status">
        Instagram connection needs attention — data paused since{" "}
        {lastSync ? relativeTime(lastSync) : "the last sync"}.
      </div>
    );
  }

  if (!lastSync) {
    return (
      <p className={styles.healthNote}>
        No sync has run yet — the first sync runs overnight.
      </p>
    );
  }

  return (
    <p className={health === "stale" ? styles.healthStale : styles.healthNote}>
      Last synced {relativeTime(lastSync)}
      {health === "stale" ? " — sync may be behind." : "."}
    </p>
  );
}

/** Skeleton shapes matching the final section layout — no spinners. */
function PerformanceSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <span className={styles.srOnly}>Loading performance data…</span>
      <div className={`${styles.skel} ${styles.skelStrip}`} aria-hidden="true" />
      <section className={styles.section} aria-hidden="true">
        <div className={`${styles.skel} ${styles.skelTitle}`} />
        <div className={styles.skelStack}>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className={`${styles.skel} ${styles.skelRow}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
