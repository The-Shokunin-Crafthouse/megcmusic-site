"use client";

import { useRef, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import styles from "./BookingForm.module.css";

type FieldErrors = Partial<Record<"name" | "email" | "message", string>>;
type Status = "idle" | "submitting" | "success" | "error";

interface ApiResult {
  ok: boolean;
  errors?: FieldErrors;
  error?: string;
}

export function BookingForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const successRef = useRef<HTMLHeadingElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      message: fd.get("message"),
      company: fd.get("company"), // honeypot
    };

    setStatus("submitting");
    setFieldErrors({});
    setFormError("");

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as ApiResult;

      if (res.ok && result.ok) {
        setStatus("success");
        // Move focus to the confirmation so screen readers land on it.
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }

      if (res.status === 400 && result.errors) {
        setFieldErrors(result.errors);
        setStatus("idle");
        // Focus the first field that came back with an error — after the
        // re-render re-enables the inputs (focusing a disabled input is a
        // no-op; studio learning #64).
        const firstKey = (["name", "email", "message"] as const).find(
          (k) => result.errors?.[k],
        );
        if (firstKey) {
          requestAnimationFrame(() => {
            const field = form.elements.namedItem(firstKey);
            if (field instanceof HTMLElement) field.focus();
          });
        }
        return;
      }

      setStatus("error");
      setFormError(
        result.error === "unavailable"
          ? "Booking is briefly unavailable. Please try again in a few minutes."
          : "Something went wrong sending your message. Please try again in a moment.",
      );
    } catch {
      setStatus("error");
      setFormError(
        "Couldn’t reach the server. Check your connection and try again.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success} role="status">
        <CheckCircle
          className={styles.successIcon}
          size={40}
          weight="fill"
          aria-hidden="true"
        />
        <h3 className={styles.successTitle} tabIndex={-1} ref={successRef}>
          Message sent
        </h3>
        <p className={styles.successText}>
          Thanks — your booking enquiry is on its way to Meghan. She’ll reply to
          your email as soon as she can.
        </p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form className={styles.form} onSubmit={onSubmit} ref={formRef} noValidate>
      {/* Honeypot — off-screen, hidden from AT and tab order. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">
          Name
        </label>
        <input
          className={styles.input}
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          aria-invalid={fieldErrors.name ? "true" : undefined}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          disabled={submitting}
        />
        {fieldErrors.name && (
          <p className={styles.fieldError} id="name-error">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
          aria-invalid={fieldErrors.email ? "true" : undefined}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          disabled={submitting}
        />
        {fieldErrors.email && (
          <p className={styles.fieldError} id="email-error">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="message">
          Tell Meghan about the show
        </label>
        <textarea
          className={styles.textarea}
          id="message"
          name="message"
          rows={6}
          required
          maxLength={4000}
          placeholder="Date, venue, city, solo or full band — whatever you have so far."
          aria-invalid={fieldErrors.message ? "true" : undefined}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          disabled={submitting}
        />
        {fieldErrors.message && (
          <p className={styles.fieldError} id="message-error">
            {fieldErrors.message}
          </p>
        )}
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send enquiry"}
        <PaperPlaneTilt
          className={styles.submitIcon}
          size={18}
          weight="fill"
          aria-hidden="true"
        />
      </button>
    </form>
  );
}
