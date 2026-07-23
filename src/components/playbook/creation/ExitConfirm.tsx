"use client";

/**
 * Exit-confirm BottomSheet (specs.md §9.5). Three actions: "Save draft &
 * exit" (keeps the persisted draft, closes), "Keep working" (dismiss),
 * "Discard draft" (clears the persisted draft, closes).
 *
 * `BottomSheet` (motion/, not owned by this directory) provides
 * `role="dialog" aria-modal="true"` but no focus trap of its own — added
 * here, scoped to this file, rather than editing shared motion
 * infrastructure. Return-focus is rAF-deferred (studio learning #64) and
 * targets `[aria-label="Exit"]` rather than a React ref: the Exit bar this
 * sheet opens from lives inside whichever take-over screen
 * (idea/question) is currently mounted under `StackNavigator`, so a ref
 * captured once would go stale across screen transitions.
 */

import { useEffect, useRef } from "react";
import { BottomSheet } from "../motion/BottomSheet";
import { TapScale } from "../motion/TapScale";
import styles from "./ExitConfirm.module.css";

interface ExitConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndExit: () => void;
  onDiscard: () => void;
}

const EXIT_BAR_SELECTOR = '[aria-label="Exit"]';
const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

export function ExitConfirm({ isOpen, onClose, onSaveAndExit, onDiscard }: ExitConfirmProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Focus trap + initial focus while open.
  useEffect(() => {
    if (!isOpen) return;
    const node = wrapRef.current;
    if (!node) return;

    const firstFocusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(node!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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
  }, [isOpen, onClose]);

  // Return focus to the opener on close (rAF-deferred — learning #64).
  useEffect(() => {
    if (isOpen) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(EXIT_BAR_SELECTOR)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Leave this idea?"
      className={styles.sheet}
    >
      <div ref={wrapRef}>
        <h2 className={styles.title}>Leave this idea?</h2>
        <p className={styles.body}>Your draft stays saved on this phone.</p>
        <div className={styles.actions}>
          <div className={styles.choiceRow}>
            <TapScale as="button" className={styles.saveButton} onClick={onSaveAndExit}>
              Save draft &amp; exit
            </TapScale>
            <TapScale as="button" className={styles.keepButton} onClick={onClose}>
              Keep working
            </TapScale>
          </div>
          <TapScale as="button" className={styles.discardButton} onClick={onDiscard}>
            Discard draft
          </TapScale>
        </div>
      </div>
    </BottomSheet>
  );
}
