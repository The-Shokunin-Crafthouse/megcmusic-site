"use client";

/**
 * One template's card: read view with placeholder chips and a
 * pending/approved badge, an inline edit mode, and Approve. Approve surfaces
 * the 422 "personal touch missing" / dash-guard error inline. Handles both
 * shapes:
 *   - Initial (per-category): subject + body + signature. Editing an
 *     approved initial does not reset approval — the server keeps the
 *     status and the weekly run always uses the latest copy.
 *   - Follow-up (global, no category): body only — no subject, sign-off
 *     lives in the body, no signature field. Editing an approved follow-up
 *     DOES reset it to pending, enforced server-side.
 */

import { useState } from "react";
import { templateKey, type Template } from "@/lib/outreach/types";
import { PlaceholderText } from "./Placeholders";
import styles from "./Outreach.module.css";

export function TemplateCard({
  template,
  onUpdated,
  placeholderNotes,
}: {
  template: Template;
  onUpdated: (next: Template) => void;
  placeholderNotes?: string[];
}) {
  const key = templateKey(template);
  const showSubject = template.subject_template !== null;
  const showSignature = template.signature !== null;

  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(template.subject_template ?? "");
  const [body, setBody] = useState(template.body_template);
  const [signature, setSignature] = useState(template.signature ?? "");
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
      const res = await fetch(`/api/outreach/templates/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
    setSubject(template.subject_template ?? "");
    setBody(template.body_template);
    setSignature(template.signature ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function save() {
    // The PATCH route matches on *_template keys — sending bare `subject`/
    // `body` here would silently no-op those fields (pre-existing bug fixed
    // in this pass: only `signature` happened to share its key name).
    const payload: Record<string, unknown> = { body_template: body };
    if (showSubject) payload.subject_template = subject;
    if (showSignature) payload.signature = signature;
    patch(payload, "save");
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
          {showSubject ? (
            <label className={styles.fieldLabel}>
              Subject
              <input
                type="text"
                className={styles.input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          ) : null}
          <label className={styles.fieldLabel}>
            Body
            <textarea
              className={styles.textarea}
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {showSignature ? (
            <label className={styles.fieldLabel}>
              Signature
              <textarea
                className={styles.textarea}
                rows={4}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </label>
          ) : null}
        </div>
      ) : (
        <div className={styles.templateBody}>
          {showSubject ? (
            <>
              <p className={styles.fieldTag}>Subject</p>
              <p className={styles.subjectLine}>
                <PlaceholderText text={template.subject_template ?? ""} />
              </p>
            </>
          ) : null}
          <p className={styles.fieldTag}>Body</p>
          <div className={styles.bodyText}>
            <PlaceholderText text={template.body_template} />
          </div>
          {showSignature ? (
            <div className={styles.signatureText}>
              <PlaceholderText text={template.signature ?? ""} />
            </div>
          ) : null}
        </div>
      )}

      {placeholderNotes && placeholderNotes.length > 0 ? (
        <ul className={styles.placeholderNotes}>
          {placeholderNotes.map((note) => (
            <li key={note} className={styles.placeholderNote}>
              {note}
            </li>
          ))}
        </ul>
      ) : null}

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
              onClick={save}
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
