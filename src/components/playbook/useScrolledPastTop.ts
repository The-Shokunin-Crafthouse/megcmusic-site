"use client";

import { useEffect, useState } from "react";

/** True once the document has scrolled past the top. Drives the nav
 *  cluster's scrolled (0.7) state — the shell scrolls the document, not an
 *  inner container, so this listens on the window. Passive listener, state
 *  only flips on a crossing so scrolling doesn't re-render per frame.
 *
 *  The two thresholds are hysteresis around the logged 24px line (ADR
 *  2026-07-22): a single cutoff re-triggers the pill's 220ms scale on
 *  every crossing, and a momentum scroll settling near it reverses the
 *  animation mid-flight several times over — measured 8 reversals in
 *  ~720ms of simulated settle, a visible pulse. Entering high and leaving
 *  low means one settle produces at most one flip. */
const ENTER_AT = 32;
const EXIT_AT = 12;

export function useScrolledPastTop() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const read = () =>
      setScrolled((prev) => {
        const y = window.scrollY;
        if (prev) return y > EXIT_AT;
        return y > ENTER_AT;
      });
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  return scrolled;
}
