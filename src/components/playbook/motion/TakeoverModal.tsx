"use client";

/**
 * Full-screen creation-flow take-over (idea entry / question page / etc.).
 * Rises from the bottom on a spring (stiffness 400 / damping 34,
 * contractual). Portals to `document.body` — repo learning #98: a
 * transformed ancestor participating in scroll/stack motion becomes the
 * containing block for a `position: fixed` child and traps its z-index in
 * a local stacking context, so this always escapes to body rather than
 * rendering inline.
 *
 * `StackNavigator` composes inside `children` to move between the
 * take-over's internal steps; this component only owns the whole-screen
 * presence transition.
 *
 * Reduced motion: no slide — an instant appear/disappear at rest position.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { REDUCED_MOTION_TRANSITION, takeoverModalSpring } from "./springs";
import styles from "./TakeoverModal.module.css";

interface TakeoverModalProps {
  isOpen: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

export function TakeoverModal({
  isOpen,
  ariaLabel,
  children,
}: TakeoverModalProps) {
  const reducedMotion = useReducedMotion();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
  }, []);

  if (!container) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.takeover}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          initial={{ y: reducedMotion ? 0 : "100%" }}
          animate={{ y: 0 }}
          exit={{ y: reducedMotion ? 0 : "100%" }}
          transition={
            reducedMotion ? REDUCED_MOTION_TRANSITION : takeoverModalSpring
          }
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}
