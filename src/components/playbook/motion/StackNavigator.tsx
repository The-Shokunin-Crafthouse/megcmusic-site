"use client";

/**
 * Creation-flow push/pop navigator (idea -> questions -> generating ->
 * storyboard). Forward: the incoming screen springs in from `x: 100%`
 * while the outgoing screen parallaxes to `x: -24%` and dims slightly.
 * Back: the same motion in reverse — the previously-dimmed screen springs
 * back to center while the current one slides fully off to the right.
 * Spring: stiffness 400 / damping 40 (contractual, `springs.ts`).
 *
 * The caller drives it with a `screenKey` (unique per step — e.g.
 * `"idea"`, `"questions-0"`, `"questions-1"`) and a `direction`
 * ("forward" | "back") set right before the key changes.
 *
 * Reduced motion: no transform — an instant opacity-only cross-cut.
 *
 * The outgoing screen fades all the way OUT rather than settling at the
 * parallax dim. These screens have no background of their own — the
 * take-over's ground is the pick lockup behind them — so an outgoing
 * screen left at 0.82 opacity stays fully legible underneath the incoming
 * one for the whole push. Measured on the question flow: both screens
 * mounted for ~480ms with their headings overlapping across a ~270px band,
 * which is the "content overlaps mid-transition" defect. Container opacity
 * is the only lever that occludes here; painting a surface colour onto the
 * screens would cover the pick ground the entrance ADR exists to preserve.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { REDUCED_MOTION_TRANSITION, stackNavigatorSpring } from "./springs";
import styles from "./StackNavigator.module.css";

export type StackDirection = "forward" | "back";

interface StackNavigatorProps {
  screenKey: string;
  direction: StackDirection;
  children: ReactNode;
}

const variants = {
  enter: (direction: StackDirection) => ({
    x: direction === "forward" ? "100%" : "-24%",
    opacity: direction === "forward" ? 1 : 0.82,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: StackDirection) => ({
    x: direction === "forward" ? "-24%" : "100%",
    opacity: 0,
  }),
};

const reducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export function StackNavigator({
  screenKey,
  direction,
  children,
}: StackNavigatorProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.stage}>
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.div
          key={screenKey}
          className={styles.screen}
          custom={direction}
          variants={reducedMotion ? reducedVariants : variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={
            reducedMotion
              ? REDUCED_MOTION_TRANSITION
              : {
                  x: stackNavigatorSpring,
                  // The outgoing screen has to be gone before the incoming
                  // one has travelled far enough to read as two stacked
                  // screens — 160ms clears it inside the first third of the
                  // spring, while the parallax still reads.
                  opacity: { duration: 0.16 },
                }
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
