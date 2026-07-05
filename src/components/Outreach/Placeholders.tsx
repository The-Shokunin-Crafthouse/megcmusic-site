/**
 * Renders template text with placeholders styled as chips:
 *   {{DOUBLE_CURLY}} — auto-filled per prospect by the weekly run
 *   [SQUARE BRACKETS] — facts Meg fills/verifies before approving
 * Everything else renders verbatim. The container preserves newlines
 * (white-space: pre-wrap in the module CSS), so this only tokenizes inline.
 */

import styles from "./Outreach.module.css";

// One regex, two capture shapes; the split keeps the delimiters so we can
// re-tag each captured token.
const TOKEN_RE = /(\{\{[^}]+\}\}|\[[^\]]+\])/g;

export function PlaceholderText({ text }: { text: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (/^\{\{[^}]+\}\}$/.test(part)) {
          return (
            <span key={index} className={styles.chipAuto} title="Filled automatically per recipient">
              {part}
            </span>
          );
        }
        if (/^\[[^\]]+\]$/.test(part)) {
          return (
            <span key={index} className={styles.chipFill} title="Fill or verify this before approving">
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
