"use client";

/**
 * Booking's venue detail sheet (specs.md §9.7) — BottomSheet default snap
 * (max-height 85dvh, scrollable), header + honest status line + outreach
 * history (from the new GET /api/outreach/prospects/[id]) + a computed
 * next-action sentence + actions.
 *
 * Status/next-action derivation reads only fields that exist on `Prospect`
 * (status/cycle/followups_sent/cooling_until/needs_action) — no invented
 * precision (no fake "around Aug 12" date when there's no scheduling field
 * to compute one from).
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { FOLLOWUP_KINDS, type Message, type Prospect } from "@/lib/outreach/types";
import { BottomSheet } from "../motion/BottomSheet";
import { TapScale } from "../motion/TapScale";
import { tapScaleSpring } from "../motion/springs";
import styles from "./VenueSheet.module.css";

interface VenueSheetProps {
  prospect: Prospect | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProspect: (id: string, patch: Partial<Prospect>) => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function monthName(dateStr: string): string | null {
  if (!DATE_RE.test(dateStr)) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function categoryLabel(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

interface StatusLine {
  chip: boolean;
  text: string;
}

function deriveStatusLine(p: Prospect): StatusLine {
  if (p.needs_action) return { chip: true, text: "Needs your reply" };
  switch (p.status) {
    case "contacted":
      return {
        chip: false,
        text: `Awaiting reply — follow-up ${p.followups_sent} of ${FOLLOWUP_KINDS.length} sent`,
      };
    case "cooling": {
      const month = p.cooling_until ? monthName(p.cooling_until) : null;
      return { chip: false, text: month ? `Cooling until ${month}` : "Cooling" };
    }
    case "replied_positive":
      return { chip: false, text: "Booked ✓" };
    case "replied_negative":
      return { chip: false, text: "Passed" };
    case "opted_out":
      return { chip: false, text: "Opted out" };
    case "new":
    default:
      return { chip: false, text: "Not yet contacted" };
  }
}

function deriveNextAction(p: Prospect): string {
  if (p.needs_action) return "Next: reply, then mark it handled.";
  switch (p.status) {
    case "new":
      return "Next: initial outreach queued for the weekly run.";
    case "contacted": {
      if (p.followups_sent >= FOLLOWUP_KINDS.length) {
        return "Next: all 3 follow-ups sent — no further step scheduled automatically.";
      }
      return `Next: follow-up ${p.followups_sent + 1} of ${FOLLOWUP_KINDS.length}.`;
    }
    case "cooling": {
      const month = p.cooling_until ? monthName(p.cooling_until) : null;
      return month
        ? `Next: re-engage after ${month}.`
        : "Next: cooling — no re-engage date set.";
    }
    case "replied_positive":
      return "Next: none — marked booked.";
    case "replied_negative":
      return "Next: none — marked passed.";
    case "opted_out":
      return "Next: none — opted out.";
    default:
      return "";
  }
}

function formatMessageDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type HistoryState =
  | { status: "loading"; messages: Message[] }
  | { status: "ready"; messages: Message[] }
  | { status: "error"; messages: Message[] };

export function VenueSheet({
  prospect,
  isOpen,
  onClose,
  onUpdateProspect,
}: VenueSheetProps) {
  // Cache the last non-null prospect so the sheet's content doesn't blank
  // out mid-close animation (BottomSheet keeps rendering during its exit
  // transition after `isOpen` flips false).
  const [cached, setCached] = useState<Prospect | null>(prospect);
  useEffect(() => {
    if (prospect) setCached(prospect);
  }, [prospect]);
  const displayProspect = prospect ?? cached;

  const [history, setHistory] = useState<HistoryState>({
    status: "loading",
    messages: [],
  });
  const [markError, setMarkError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !displayProspect) return;
    let cancelled = false;
    setHistory({ status: "loading", messages: [] });
    setMarkError(null);

    fetch(`/api/outreach/prospects/${displayProspect.id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (json as { error?: string } | null)?.error ??
              "Couldn't load outreach history.",
          );
        }
        return json as { prospect: Prospect; messages: Message[] };
      })
      .then((data) => {
        if (cancelled) return;
        setHistory({ status: "ready", messages: data.messages });
      })
      .catch(() => {
        if (!cancelled) setHistory({ status: "error", messages: [] });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, displayProspect?.id]);

  async function handleMarkHandled() {
    if (!displayProspect) return;
    const id = displayProspect.id;
    setMarkError(null);
    onUpdateProspect(id, { needs_action: false });
    try {
      const res = await fetch(`/api/outreach/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs_action: false }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onUpdateProspect(id, { needs_action: true });
      setMarkError("Couldn't save — try again.");
    }
  }

  const reducedMotion = useReducedMotion();

  if (!displayProspect) return null;

  const statusLine = deriveStatusLine(displayProspect);
  const nextAction = deriveNextAction(displayProspect);
  const metaParts = [
    categoryLabel(displayProspect.category),
    displayProspect.city,
    `cycle ${displayProspect.cycle}`,
  ].filter((part): part is string => Boolean(part));
  const gmailHref = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(displayProspect.email)}`;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`${displayProspect.org} details`}
    >
      <div className={styles.wrap}>
        <header className={styles.header}>
          <p className={styles.venueName}>{displayProspect.org}</p>
          <p className={styles.contacts}>
            {displayProspect.contact_name ?? "No contact on file"}
          </p>
          <p className={styles.meta}>
            {metaParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {index > 0 ? <span className={styles.slash}> / </span> : null}
                <span className={index === 0 ? styles.metaType : styles.metaValue}>
                  {part}
                </span>
              </span>
            ))}
          </p>
        </header>

        {statusLine.chip ? (
          <span className={styles.statusChip}>{statusLine.text}</span>
        ) : (
          <p className={styles.statusText}>{statusLine.text}</p>
        )}

        <section aria-label="Outreach history" className={styles.historySection}>
          {history.status === "loading" ? (
            <div className={styles.historySkeleton} aria-hidden="true" />
          ) : null}
          {history.status === "error" ? (
            <p className={styles.errorText} role="status" aria-live="polite">
              Couldn&apos;t load outreach history.
            </p>
          ) : null}
          {history.status === "ready" && history.messages.length === 0 ? (
            <p className={styles.mutedText}>No messages sent yet.</p>
          ) : null}
          {history.status === "ready" && history.messages.length > 0 ? (
            <ul className={styles.historyList}>
              {history.messages.map((message) => (
                <li key={message.id} className={styles.historyItem}>
                  <p className={styles.historyMeta}>
                    <span
                      className={
                        message.direction === "inbound"
                          ? styles.directionInbound
                          : styles.directionOutbound
                      }
                    >
                      {message.direction === "inbound" ? "They replied" : "Sent"}
                    </span>
                    <span className={styles.historyDate}>
                      {formatMessageDate(message.created_at)}
                    </span>
                  </p>
                  <p className={styles.historySnippet}>{message.body ?? ""}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <p className={styles.nextAction}>{nextAction}</p>

        <div className={styles.actions}>
          <motion.a
            href={gmailHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.gmailLink}
            aria-label={`Open ${displayProspect.org}'s email thread in Gmail`}
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            transition={tapScaleSpring}
          >
            Open in Gmail
            <ArrowSquareOut weight="bold" aria-hidden="true" className={styles.gmailIcon} />
          </motion.a>
          {displayProspect.needs_action ? (
            <TapScale
              as="button"
              className={styles.markHandled}
              onClick={handleMarkHandled}
              ariaLabel="Mark handled"
            >
              Mark handled
            </TapScale>
          ) : null}
        </div>
        {markError ? (
          <p className={styles.errorText} role="status" aria-live="polite">
            {markError}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
