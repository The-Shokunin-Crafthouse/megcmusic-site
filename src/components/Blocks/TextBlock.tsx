import { useId } from "react";
import type { Block } from "@/lib/blocks";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./TextBlock.module.css";

/**
 * Text section block (Sprint 17) — a ★★★-labelled heading with Meg's
 * paragraphs in the Liner Notes prose voice. It IS a section: it renders at
 * the page's section rhythm, not inside a block run, so it reads like the
 * sections around it. Nothing interactive. Spec:
 * _config/design-system/a11y-spec.md.
 */
export function TextBlock({ block }: { block: Extract<Block, { layout: "text" }> }) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <SectionLabel id={headingId}>{block.heading}</SectionLabel>
        <div className={styles.prose}>
          {block.paragraphs.map((para, i) => (
            <p key={i} className={styles.para}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
