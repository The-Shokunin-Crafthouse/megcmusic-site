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
    opacity: direction === "forward" ? 0.82 : 1,
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
              : { x: stackNavigatorSpring, opacity: { duration: 0.22 } }
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
