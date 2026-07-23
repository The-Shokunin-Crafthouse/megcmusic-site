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
import {
  REDUCED_MOTION_TRANSITION,
  pickCurtainTransition,
  takeoverModalSpring,
} from "./springs";
import { PickLockup } from "../PickLockup";
import styles from "./TakeoverModal.module.css";

/** Mirrors --pb-pick-corner-scale in token-map.css; framer-motion animates
 *  a number, not a custom property, so the one value is read here. */
const PICK_CORNER_SCALE = 0.0942873;

interface TakeoverModalProps {
  isOpen: boolean;
  ariaLabel: string;
  /** `rise` is the contract's bottom-spring entrance (§7). `pick` instead
   *  grows the corner pick lockup until it fills the screen and becomes
   *  the take-over's own ground — which is literally what the comp draws
   *  behind the creation flow (see `PickLockup`), so the creation
   *  take-over uses it and the library keeps `rise`. */
  entrance?: "rise" | "pick";
  children: React.ReactNode;
}

export function TakeoverModal({
  isOpen,
  ariaLabel,
  entrance = "rise",
  children,
}: TakeoverModalProps) {
  const reducedMotion = useReducedMotion();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
  }, []);

  if (!container) return null;

  if (entrance === "pick") {
    const corner = PICK_CORNER_SCALE;
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`${styles.takeover} ${styles.pickGround}`}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* The ground: the corner lockup growing until the pick is the
                screen. Nothing crossfades — the shape that was in the
                corner is the shape you end up looking at. */}
            <motion.div
              className={styles.pickCurtain}
              variants={{
                closed: { "--pb-pick-scale": corner },
                open: { "--pb-pick-scale": 1 },
              }}
              transition={
                reducedMotion ? REDUCED_MOTION_TRANSITION : pickCurtainTransition
              }
            >
              {/* The lockup reads the scale off this wrapper, so the clip
                  window stays viewport-sized while only the artwork grows —
                  scaling a wrapper would shrink the mask with it. */}
              <PickLockup className={styles.pickLayer} />
            </motion.div>
            {/* Nothing on the screen shows during the fill — the beat is
                the pick arriving, not a crossfade underneath it. The
                staggered entrance that follows is CSS on the creation
                screens' own blocks (see creation.module.css), keyed off
                this attribute, so both take-over screens get the same
                choreography without either knowing about it. */}
            <div className={styles.pickContent} data-pick-reveal="true">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      container,
    );
  }

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
