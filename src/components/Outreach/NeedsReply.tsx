"use client";

/**
 * The "Needs your reply" queue — pinned above everything. One card per
 * needs_action prospect: org + contact, category chip, a 2-line snippet of the
 * latest inbound message, time since it arrived, a link that opens the thread
 * in Gmail, and a "Mark handled" button. Mark-handled is optimistic in the
 * parent; the card only reflects busy/error for its own row.
 */

import { useState } from "react";
import type { NeedsActionItem } from "@/lib/outreach/types";
import { categoryChip } from "./categories";
import { relativeTime } from "./relativeTime";
import styles from "./Outreach.module.css";

function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}

function NeedsReplyCard({
  item,
  onMarkHandled,
}: {
  item: NeedsActionItem;
  onMarkHandled: (id: string) => Promise<void>;
}) {
  const { prospect, latestInbound } = item;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setError(null);
    try {
      await onMarkHandled(prospect.id);
    } catch {
      setError("Couldn't mark handled — please try again.");
      setBusy(false);
    }
  }

  return (
    <article className={styles.replyCard}>
      <div className={styles.replyHead}>
        <div>
          <h4 className={styles.replyOrg}>{prospect.org}</h4>
          {prospect.contact_name ? (
            <p className={styles.replyContact}>{prospect.contact_name}</p>
          ) : null}
        </div>
        <span className={styles.chip}>{categoryChip(prospect.category)}</span>
      </div>

      {latestInbound ? (
        <p className={styles.replySnippet}>{latestInbound.snippet}</p>
      ) : (
        <p className={styles.replySnippetMuted}>
          She replied — open the thread to read it.
        </p>
      )}

      <div className={styles.replyFoot}>
        <span className={styles.replyTime}>
          {relativeTime(latestInbound?.created_at ?? null)}
        </span>
        <div className={styles.replyActions}>
          {prospect.gmail_thread_id ? (
            <a
              className={styles.btnGhost}
              href={gmailThreadUrl(prospect.gmail_thread_id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Gmail
            </a>
          ) : null}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handle}
            disabled={busy}
          >
            {busy ? "…" : "Mark handled"}
          </button>
        </div>
      </div>

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}

export function NeedsReply({
  items,
  onMarkHandled,
}: {
  items: NeedsActionItem[];
  onMarkHandled: (id: string) => Promise<void>;
}) {
  return (
    <section className={styles.section} aria-labelledby="outreach-needs">
      <h3 className={styles.sectionTitle} id="outreach-needs">
        Needs your reply
      </h3>
      {items.length === 0 ? (
        <p className={styles.emptyLine}>
          All caught up — no replies waiting on you right now.
        </p>
      ) : (
        <div className={styles.replyGrid}>
          {items.map((item) => (
            <NeedsReplyCard
              key={item.prospect.id}
              item={item}
              onMarkHandled={onMarkHandled}
            />
          ))}
        </div>
      )}
    </section>
  );
}
