"use client";

/**
 * One category's email template: read view with placeholder chips and a
 * pending/approved badge, an inline edit mode (subject input + body/signature
 * textareas), and Approve. Approve surfaces the 422 "personal touch missing"
 * error inline. Editing an approved template does not reset approval — the
 * server keeps the status and the weekly run always uses the latest copy.
 */

import { useState } from "react";
import type { Template } from "@/lib/outreach/types";
import { PlaceholderText } from "./Placeholders";
import styles from "./Outreach.module.css";

export function TemplateCard({
  template,
  onUpdated,
}: {
  template: Template;
  onUpdated: (next: Template) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(template.subject_template);
  const [body, setBody] = useState(template.body_template);
  const [signature, setSignature] = useState(template.signature);
  const [busy, setBusy] = useState<null | "save" | "approve">(null);
  const [error, setError] = useState<string | null>(null);

  const isApproved = template.status === "approved";

  async function patch(
    payload: Record<string, unknown>,
    which: "save" | "approve",
  ) {
    setBusy(which);
    setError(null);
    try {
      const res = await fetch(
        `/api/outreach/templates/${encodeURIComponent(template.category)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => null)) as
        | Template
        | { error: string }
        | null;
      if (!res.ok) {
        const message =
          data && "error" in data ? data.error : `Request failed (${res.status}).`;
        setError(message);
        return;
      }
      onUpdated(data as Template);
      if (which === "save") setEditing(false);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit() {
    setSubject(template.subject_template);
    setBody(template.body_template);
    setSignature(template.signature);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHead}>
        <div>
          <h4 className={styles.templateLabel}>{template.label}</h4>
          <p className={styles.templateAudience}>{template.audience}</p>
        </div>
        <span
          className={`${styles.badge} ${isApproved ? styles.badgeApproved : styles.badgePending}`}
        >
          {template.status}
        </span>
      </div>

      {editing ? (
        <div className={styles.editFields}>
          <label className={styles.fieldLabel}>
            Subject
            <input
              type="text"
              className={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className={styles.fieldLabel}>
            Body
            <textarea
              className={styles.textarea}
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className={styles.fieldLabel}>
            Signature
            <textarea
              className={styles.textarea}
              rows={4}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className={styles.templateBody}>
          <p className={styles.fieldTag}>Subject</p>
          <p className={styles.subjectLine}>
            <PlaceholderText text={template.subject_template} />
          </p>
          <p className={styles.fieldTag}>Body</p>
          <div className={styles.bodyText}>
            <PlaceholderText text={template.body_template} />
          </div>
          <div className={styles.signatureText}>
            <PlaceholderText text={template.signature} />
          </div>
        </div>
      )}

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.templateActions}>
        {editing ? (
          <>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => patch({ subject, body, signature }, "save")}
              disabled={busy !== null}
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={cancelEdit}
              disabled={busy !== null}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={startEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => patch({ approve: true }, "approve")}
              disabled={busy !== null || isApproved}
              aria-disabled={isApproved}
            >
              {isApproved
                ? "Approved"
                : busy === "approve"
                  ? "Approving…"
                  : "Approve"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
