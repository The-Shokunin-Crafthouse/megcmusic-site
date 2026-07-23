"use client";

import { useEffect, useState } from "react";

/** True once the document has scrolled past `threshold`. Drives the nav
 *  cluster's scrolled (0.7) state — the shell scrolls the document, not an
 *  inner container, so this listens on the window. Passive listener, state
 *  only flips on a crossing so scrolling doesn't re-render per frame. */
export function useScrolledPastTop(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > threshold);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [threshold]);

  return scrolled;
}
