"use client";

/**
 * List-entrance helper for streaming/partial results (e.g. GenerationWait's
 * `streaming` state rendering frames as they arrive). 60ms stagger between
 * children, ease-out entrance per child, 220ms standard duration.
 *
 * Reduced motion: children appear instantly, no stagger, no transform.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Children } from "react";
import { EASE_OUT, STAGGER_DELAY } from "./springs";

interface StaggeredProps {
  children: ReactNode;
  className?: string;
  /** Rendered element/component for each staggered item's wrapper. */
  as?: "div" | "ul";
  itemClassName?: string;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER_DELAY },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

const reducedItem = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.001 } },
};

export function Staggered({
  children,
  className,
  as = "div",
  itemClassName,
}: StaggeredProps) {
  const reducedMotion = useReducedMotion();
  const Wrapper = as === "ul" ? motion.ul : motion.div;
  const ItemTag = as === "ul" ? motion.li : motion.div;

  return (
    <Wrapper
      className={className}
      variants={reducedMotion ? undefined : container}
      initial={reducedMotion ? undefined : "hidden"}
      animate={reducedMotion ? undefined : "show"}
    >
      {Children.map(children, (child, index) => (
        <ItemTag
          key={index}
          className={itemClassName}
          variants={reducedMotion ? reducedItem : item}
          initial={reducedMotion ? "hidden" : undefined}
          animate={reducedMotion ? "show" : undefined}
        >
          {child}
        </ItemTag>
      ))}
    </Wrapper>
  );
}
