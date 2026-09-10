import styles from "./PullQuote.module.css";

/**
 * Pull-quote panel (Figma 39:114): plum panel, pink left rule, rounded
 * bottom-right, the quote in italic display type over a teal attribution.
 * Extracted from LinerNotes (Sprint 13 Phase 2) so Meg's `pull_quote` Home
 * block renders the same panel; LinerNotes keeps its one-line-on-desktop rule
 * through `oneLineFromTablet`, which the block does not set.
 */
export function PullQuote({
  quote,
  attribution,
  oneLineFromTablet = false,
}: {
  quote: string;
  attribution?: string;
  oneLineFromTablet?: boolean;
}) {
  return (
    <blockquote className={styles.quote}>
      <p className={oneLineFromTablet ? `${styles.quoteText} ${styles.oneLine}` : styles.quoteText}>
        {`“${quote}”`}
      </p>
      {attribution && <cite className={styles.quoteAttr}>{attribution}</cite>}
    </blockquote>
  );
}
