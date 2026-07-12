"use client";

/**
 * Booking Outreach tab orchestrator. Fetches /api/outreach/summary on mount and
 * renders three sections in order: Needs your reply (pinned), Email templates,
 * Pipeline. Owns the summary state and the two optimistic mutations —
 * mark-handled and template update — so the child sections stay presentational.
 *
 * Four states: loading (skeleton, no spinner), error (retry), empty (written
 * copy inside each section), populated.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isFollowupKind,
  templateKey,
  type OutreachSummary,
  type Template,
} from "@/lib/outreach/types";
import { FOLLOWUP_PLACEHOLDER_NOTES, SHARED_PLACEHOLDER_NOTE } from "@/lib/outreach/followupPlaceholders";
import { NeedsReply } from "./NeedsReply";
import { Pipeline } from "./Pipeline";
import { TemplateCard } from "./TemplateCard";
import styles from "./Outreach.module.css";

type Status = "loading" | "error" | "ready";

export function Outreach() {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<OutreachSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const res = await fetch("/api/outreach/summary", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Summary failed (${res.status}).`);
      const data = (await res.json()) as OutreachSummary;
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

  // Optimistic mark-handled: drop the row from the queue and clear the flag in
  // the pipeline immediately; revert and rethrow on failure so the card shows
  // its error.
  const markHandled = useCallback(async (id: string) => {
    let snapshot: OutreachSummary | null = null;
    setSummary((current) => {
      if (!current) return current;
      snapshot = current;
      return {
        ...current,
        needsAction: current.needsAction.filter((i) => i.prospect.id !== id),
        pipeline: {
          ...current.pipeline,
          replied_positive: current.pipeline.replied_positive.map((p) =>
            p.id === id ? { ...p, needs_action: false } : p,
          ),
        },
      };
    });
    try {
      const res = await fetch(`/api/outreach/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs_action: false }),
      });
      if (!res.ok) throw new Error("mark handled failed");
    } catch (err) {
      if (snapshot) setSummary(snapshot);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback((next: Template) => {
    setSummary((current) =>
      current
        ? {
            ...current,
            templates: current.templates.map((t) =>
              templateKey(t) === templateKey(next) ? next : t,
            ),
          }
        : current,
    );
  }, []);

  if (status === "loading") return <OutreachSkeleton />;

  if (status === "error") {
    return (
      <div className={styles.stateBox}>
        <p className={styles.stateText}>
          Couldn&apos;t load the outreach board.
        </p>
        <button type="button" className={styles.btnPrimary} onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const initialTemplates = summary.templates.filter((t) => t.kind === "initial");
  const followupTemplates = summary.templates.filter((t) => isFollowupKind(t.kind));

  return (
    <div className={styles.root}>
      <NeedsReply items={summary.needsAction} onMarkHandled={markHandled} />

      <section className={styles.section} aria-labelledby="outreach-templates">
        <h3 className={styles.sectionTitle} id="outreach-templates">
          Email templates
        </h3>
        {initialTemplates.length === 0 ? (
          <p className={styles.emptyLine}>
            Templates aren&apos;t loaded yet — run the seed migration.
          </p>
        ) : (
          <div className={styles.templateGrid}>
            {initialTemplates.map((template) => (
              <TemplateCard
                key={templateKey(template)}
                template={template}
                onUpdated={updateTemplate}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="outreach-followups">
        <h3 className={styles.sectionTitle} id="outreach-followups">
          Follow-up templates
        </h3>
        <p className={styles.emptyLine}>
          Global — one set shared across every category, sent as replies on the
          original thread. {SHARED_PLACEHOLDER_NOTE}
        </p>
        {followupTemplates.length === 0 ? (
          <p className={styles.emptyLine}>
            Follow-up templates aren&apos;t loaded yet — run the seed migration.
          </p>
        ) : (
          <div className={styles.templateGrid}>
            {followupTemplates.map((template) =>
              isFollowupKind(template.kind) ? (
                <TemplateCard
                  key={templateKey(template)}
                  template={template}
                  onUpdated={updateTemplate}
                  placeholderNotes={FOLLOWUP_PLACEHOLDER_NOTES[template.kind]}
                />
              ) : null,
            )}
          </div>
        )}
      </section>

      <Pipeline buckets={summary.pipeline} />
    </div>
  );
}

/** Skeleton shapes matching the final section layout — no spinners. */
function OutreachSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <span className={styles.srOnly}>Loading the outreach board…</span>
      {[0, 1, 2].map((section) => (
        <section key={section} className={styles.section} aria-hidden="true">
          <div className={`${styles.skel} ${styles.skelTitle}`} />
          <div className={styles.skelStack}>
            {[0, 1, 2].map((row) => (
              <div key={row} className={`${styles.skel} ${styles.skelCard}`} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
