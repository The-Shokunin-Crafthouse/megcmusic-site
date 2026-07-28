"use client";

/**
 * First-run screen (specs.md §"Screen 10" — "First-run screen"). A
 * once-ever full-screen overlay, gated on a localStorage flag, shown
 * before the tab shell is meaningfully interactive. Copy is verbatim from
 * the spec.
 *
 * SSR-safety: the localStorage check only runs after mount (`mounted`
 * state), so the server-rendered pass and the first client pass agree
 * (both render nothing) and the overlay only appears once hydration has
 * settled — no hydrate-mismatch flash.
 *
 * Mounted at the top of `PlaybookApp`, above `PlaybookShell`, so it visibly
 * blocks first paint of the tab content without needing to coordinate with
 * the shell's own render.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Export, Lightbulb } from "@phosphor-icons/react";
import { TapScale } from "./motion/TapScale";
import { REDUCED_MOTION_TRANSITION } from "./motion/springs";
import styles from "./FirstRun.module.css";

const STORAGE_KEY = "pb-first-run-done";
const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

function isStandalone(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function FirstRun() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    let alreadyDone = false;
    try {
      alreadyDone = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      alreadyDone = false;
    }
    setDismissed(alreadyDone);
    setShowInstallCard(!isStandalone());
  }, []);

  const isOpen = mounted && !dismissed;

  // Focus trap while open — this is the first thing the app shows, so
  // there is no prior "opener" element to return focus to on dismiss.
  useEffect(() => {
    if (!isOpen) return;
    const node = wrapRef.current;
    const firstFocusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleDismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best-effort — a private-browsing session without localStorage just
      // re-shows first-run next time, not a functional break.
    }
    setDismissed(true);
  }

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          ref={wrapRef}
          className={styles.wrap}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to your playbook"
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={reducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.22 }}
        >
          <div className={styles.markWrap} aria-hidden="true">
            <img
              className={styles.mark}
              src="/images/playbook/pick-mark.svg"
              alt=""
              width={96}
              height={96}
            />
            <Lightbulb weight="fill" className={styles.lightbulb} />
          </div>

          <h1 className={styles.headline}>Hey Meg.</h1>
          <p className={styles.body}>
            This is your playbook — your stats, your gigs, your next post,
            all in one pocket. When you&apos;ve got an idea, I&apos;ll help
            you build it into a storyboard. Everything here is yours alone.
          </p>

          {showInstallCard ? (
            <div className={styles.installCard}>
              <p className={styles.installTitle}>Put it on your home screen</p>
              <p className={styles.installSteps}>
                Tap Share{" "}
                <Export size={14} weight="bold" aria-hidden="true" className={styles.installIcon} />{" "}
                &rarr; Add to Home Screen
              </p>
            </div>
          ) : null}

          <TapScale
            as="button"
            className={styles.cta}
            onClick={handleDismiss}
            ariaLabel="Let's look around"
          >
            Let&apos;s look around
          </TapScale>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
