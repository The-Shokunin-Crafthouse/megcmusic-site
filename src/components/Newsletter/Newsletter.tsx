"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./Newsletter.module.css";

// Newsletter (Sprint 6 §4.7 — no comp; designed from the brand). Mailchimp's
// classic endpoint has no CORS, so we POST via its JSONP variant and surface
// success/error inline without leaving the page. EMAIL + FNAME are both required
// by the audience; a honeypot ships to catch bots. No Mailchimp CSS/JS.
const MC_BASE =
  "https://megcmusic.us7.list-manage.com/subscribe/post-json?u=2d6754f1ba83c5b3076ed55b8&id=4c1d223a0c&f_id=001e08e0f0";
const HONEYPOT = "b_2d6754f1ba83c5b3076ed55b8_4c1d223a0c";

type Status = "idle" | "submitting" | "success" | "error";

function jsonp(url: string): Promise<{ result: string; msg: string }> {
  return new Promise((resolve, reject) => {
    const cb = `mc_cb_${Date.now()}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const cleanup = () => {
      delete w[cb];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 10_000);
    w[cb] = (data: { result: string; msg: string }) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("network"));
    };
    script.src = `${url}&c=${cb}`;
    document.body.appendChild(script);
  });
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

export function Newsletter({
  headline,
  blurb,
  birthdayNote,
}: {
  headline: string;
  blurb: string;
  birthdayNote: string;
}) {
  const [fname, setFname] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const fnameError = touched && !fname.trim() ? "Add your first name." : "";
  const emailError = touched && !emailOk(email) ? "Enter a valid email address." : "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!fname.trim() || !emailOk(email)) return;
    if (honeypotRef.current?.value) return; // bot
    setStatus("submitting");
    setMessage("");
    try {
      const url =
        `${MC_BASE}&EMAIL=${encodeURIComponent(email)}` +
        `&FNAME=${encodeURIComponent(fname)}` +
        `&BIRTHDAY=${encodeURIComponent(birthday)}&${HONEYPOT}=`;
      const res = await jsonp(url);
      if (res.result === "success") {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(
          /already subscribed/i.test(res.msg)
            ? "You’re already on the list — see you at a show."
            : stripTags(res.msg) || "That didn’t go through. Try again?",
        );
      }
    } catch {
      setStatus("error");
      setMessage("Couldn’t reach the mailing list. Try again in a moment.");
    }
  }

  return (
    <section className={styles.section} aria-labelledby="news-heading">
      <div className={styles.inner}>
        <div className={styles.pitch}>
          <SectionLabel id="news-heading">The Mailing List</SectionLabel>
          <p className={styles.headline}>{headline}</p>
          <p className={styles.blurb}>{blurb}</p>
        </div>

        {status === "success" ? (
          <p className={styles.success} role="status">
            You’re on the list — see you at a show soon.
          </p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${baseId}-fname`}>
                First name
              </label>
              <input
                id={`${baseId}-fname`}
                className={styles.input}
                type="text"
                name="FNAME"
                autoComplete="given-name"
                placeholder="Meghan"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                aria-invalid={!!fnameError}
                aria-describedby={fnameError ? `${baseId}-fname-err` : undefined}
                required
              />
              {fnameError && (
                <span id={`${baseId}-fname-err`} className={styles.fieldError}>
                  {fnameError}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${baseId}-email`}>
                Email
              </label>
              <input
                id={`${baseId}-email`}
                className={styles.input}
                type="email"
                name="EMAIL"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? `${baseId}-email-err` : undefined}
                required
              />
              {emailError && (
                <span id={`${baseId}-email-err`} className={styles.fieldError}>
                  {emailError}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${baseId}-bday`}>
                Birthday <span className={styles.optional}>(optional)</span>
              </label>
              <span id={`${baseId}-bday-hint`} className={styles.hint}>
                {birthdayNote}
              </span>
              <input
                id={`${baseId}-bday`}
                className={styles.input}
                type="text"
                name="BIRTHDAY"
                inputMode="numeric"
                placeholder="MM / DD"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                aria-describedby={`${baseId}-bday-hint`}
              />
            </div>

            {/* Honeypot — hidden from people, catches bots. */}
            <div className={styles.honeypot} aria-hidden="true">
              <input ref={honeypotRef} type="text" name={HONEYPOT} tabIndex={-1} defaultValue="" autoComplete="off" />
            </div>

            <button className={styles.submit} type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Signing you up…" : "Join the list"}
            </button>

            {status === "error" && (
              <p className={styles.formError} role="alert">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
