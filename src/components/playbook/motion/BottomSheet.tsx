"use client";

/**
 * Studio-standard mobile bottom-sheet primitive (learning #16): snap-based
 * spring (stiffness 400 / damping 25), px snap points, drag-to-dismiss, no
 * scrim, capture-phase outside-tap dismiss, portals to `document.body`
 * (learning #98). Controlled via `isOpen`/`onClose` rather than the
 * learning's literal single `open()` API — functionally equivalent for a
 * React consumer (the store's creation-flow phase already drives
 * open/closed), and keeps this a normal controlled component.
 *
 * `useAnimation` (framer-motion's imperative controls) is the deliberate
 * choice here over a bound `style={{ y }}` MotionValue: passing a
 * MotionValue via `style` makes framer-motion ignore the `animate`/`exit`
 * props for that key, which breaks the combination of gesture-driven drag
 * with a programmatic snap-back — `useAnimation` lets `drag` own the
 * transform during a gesture and `controls.start` reclaim it on release.
 *
 * Reduced motion: opens/closes at rest position with no slide; drag-to-
 * dismiss still works (it's a direct manipulation, not an animation).
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useReducedMotion,
} from "framer-motion";
import { REDUCED_MOTION_TRANSITION, bottomSheetSpring } from "./springs";
import styles from "./BottomSheet.module.css";

interface DragEndInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** Snap points as px offsets from fully open (0 = fully open; larger =
   *  further collapsed toward the bottom edge). Default: single fully-open
   *  snap. */
  snapPoints?: number[];
}

export function BottomSheet({
  isOpen,
  onClose,
  ariaLabel,
  children,
  snapPoints = [0],
}: BottomSheetProps) {
  const reducedMotion = useReducedMotion();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();

  const sorted = [...snapPoints].sort((a, b) => a - b);
  const restPoint = sorted[0] ?? 0;
  const maxSnap = sorted[sorted.length - 1] ?? 0;
  const dismissThreshold = maxSnap + 120;

  useEffect(() => {
    setContainer(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (reducedMotion) {
      controls.set({ y: restPoint });
      return;
    }
    controls.set({ y: "100%" });
    controls.start({ y: restPoint, transition: bottomSheetSpring });
    // Re-run only when the sheet opens, not on every restPoint recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reducedMotion]);

  // Capture-phase outside-tap dismiss: no scrim, so the whole document is
  // the dismiss surface, caught before any inner handler can stop it.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isOpen, onClose]);

  if (!container) return null;

  function handleDragEnd(_event: unknown, info: DragEndInfo) {
    const projected = restPoint + info.offset.y + info.velocity.y * 0.15;
    if (projected > dismissThreshold || info.velocity.y > 900) {
      onClose();
      return;
    }
    const nearest = sorted.reduce(
      (closest, point) =>
        Math.abs(point - projected) < Math.abs(closest - projected)
          ? point
          : closest,
      restPoint,
    );
    controls.start({ y: nearest, transition: bottomSheetSpring });
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={styles.sheet}
          drag="y"
          dragElastic={0.1}
          dragConstraints={{ top: 0, bottom: dismissThreshold }}
          onDragEnd={handleDragEnd}
          animate={controls}
          exit={{
            y: reducedMotion ? restPoint : "100%",
            transition: reducedMotion
              ? REDUCED_MOTION_TRANSITION
              : bottomSheetSpring,
          }}
        >
          <div className={styles.grabber} aria-hidden="true" />
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}
