"use client";

/**
 * Fixed-look bottom Exit bar, identical on the idea-entry and question-page
 * take-overs (spec §Screen 5 / §Screen 6). A full-width 70px tap target —
 * the whole bar is the button, not just the label.
 *
 * `ariaLabel="Exit"` is deliberately set even though it duplicates the
 * visible text: `ExitConfirm` (the sheet this opens) has no reliable React
 * ref back to whichever Exit bar is currently mounted — the idea/question
 * screens swap in and out under `StackNavigator` — so it returns focus by
 * querying `[aria-label="Exit"]` in the DOM instead (see ExitConfirm.tsx).
 */

import { TapScale } from "../motion/TapScale";
import styles from "./creation.module.css";

interface ExitBarProps {
  onExit: () => void;
}

export function ExitBar({ onExit }: ExitBarProps) {
  return (
    <TapScale as="button" className={styles.exitBar} onClick={onExit} ariaLabel="Exit">
      Exit
    </TapScale>
  );
}
