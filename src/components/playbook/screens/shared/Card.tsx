/**
 * Universal translucent card (spec §Global structural notes: 16px radius,
 * `rgba(163,88,135,0.10)` fill — `--pb-card-bg`/`--pb-radius-card`), used
 * on every base-surface screen. `bordered` applies the Stats #1-ranked
 * post's distinguishing border+shadow (`--pb-post-card-border`/
 * `--pb-post-card-shadow`) — the only card variant in either comp.
 */

import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  as?: "div" | "li";
}

export function Card({ children, className, bordered = false, as = "div" }: CardProps) {
  const combined = [styles.card, bordered ? styles.bordered : "", className]
    .filter(Boolean)
    .join(" ");
  const Tag = as;
  return <Tag className={combined}>{children}</Tag>;
}
