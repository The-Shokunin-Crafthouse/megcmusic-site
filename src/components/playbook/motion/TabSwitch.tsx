"use client";

/**
 * Crossfade + 8px y-shift between the shell's four tab panels
 * (Home/Stats/Booking/Checklist), 220ms ease-out. Both panels occupy the
 * same CSS grid cell during the overlap (`TabSwitch.module.css`) so there
 * is no layout jump between panels of different heights.
 *
 * Reduced motion: instant opacity-only cut, no y-shift — the panel swap
 * still happens, just without the transform.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { REDUCED_MOTION_TRANSITION, tabSwitchTransition } from "./springs";
import styles from "./TabSwitch.module.css";

interface TabSwitchProps {
  /** Unique key for the panel currently showing (typically the active tab
   *  id) — swapping this key drives the crossfade. */
  activeKey: string;
  children: ReactNode;
}

export function TabSwitch({ activeKey, children }: TabSwitchProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.stage}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={activeKey}
          className={styles.panel}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={reducedMotion ? REDUCED_MOTION_TRANSITION : tabSwitchTransition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
