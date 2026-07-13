"use client";

/**
 * Studio-standard tap affordance (learning #17): scale to 0.92 on
 * pointerdown, spring (stiffness 400 / damping 30), <=220ms settle.
 * Wraps any pressable — button, card, list row — via the `as` prop.
 *
 * `as="div"` renders a link-shaped control using the `aria-disabled`
 * pattern (repo learning: native `disabled` drops a control from the
 * a11y tree; `aria-disabled="true"` keeps it focusable and announced).
 *
 * Reduced motion: the scale transform is dropped entirely; the optional
 * accent flash (an instant background tint, no transform) still fires so
 * a press still registers visually.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { ReactNode } from "react";
import { tapScaleSpring } from "./springs";
import styles from "./TapScale.module.css";

interface TapScaleProps {
  children: ReactNode;
  as?: "button" | "div";
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  ariaCurrent?: React.AriaAttributes["aria-current"];
  /** Native disabled for `as="button"`; `aria-disabled` for `as="div"`. */
  disabled?: boolean;
  /** Fires a 120ms accent-flash background tint alongside (or, under
   *  reduced motion, instead of) the scale. */
  accentFlash?: boolean;
}

export function TapScale({
  children,
  as = "button",
  type = "button",
  onClick,
  className,
  ariaLabel,
  ariaCurrent,
  disabled = false,
  accentFlash = false,
}: TapScaleProps) {
  const reducedMotion = useReducedMotion();
  const [flashing, setFlashing] = useState(false);

  function fireFlash() {
    if (!accentFlash) return;
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 120);
  }

  const combinedClassName = [styles.pressable, flashing ? styles.flash : "", className]
    .filter(Boolean)
    .join(" ");

  const sharedProps = {
    className: combinedClassName,
    onClick: disabled ? undefined : onClick,
    onPointerDown: disabled ? undefined : fireFlash,
    "aria-label": ariaLabel,
    "aria-current": ariaCurrent,
    whileTap: reducedMotion || disabled ? undefined : { scale: 0.92 },
    transition: tapScaleSpring,
  } as const;

  if (as === "div") {
    return (
      <motion.div
        {...sharedProps}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={
          disabled
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fireFlash();
                  onClick?.();
                }
              }
        }
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.button {...sharedProps} type={type} disabled={disabled}>
      {children}
    </motion.button>
  );
}
