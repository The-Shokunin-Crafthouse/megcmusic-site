import { useId } from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import type { HomeBlock } from "@/lib/home-blocks";
import styles from "./Announcement.module.css";

/** A link that leaves the site opens in a new tab and says so to a screen
 *  reader; a same-site link (a path, or one of our own hosts) does not. */
function isExternal(url: string): boolean {
  if (url.startsWith("/") || url.startsWith("#")) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host !== "megcmusic.com";
  } catch {
    return false;
  }
}

/**
 * Announcement block (Sprint 13 Phase 1) — a new single, an award, a tour
 * date. The pull-quote's panel carrying a headline; the site's text-link
 * pattern when Meg gives it both a label and an address. Spec:
 * _config/design-system/a11y-spec.md.
 */
export function Announcement({ block }: { block: Extract<HomeBlock, { layout: "announcement" }> }) {
  const headingId = useId();
  const external = block.linkUrl ? isExternal(block.linkUrl) : false;
  return (
    <article className={styles.block} aria-labelledby={headingId}>
      {block.eyebrow && <p className={styles.eyebrow}>{block.eyebrow}</p>}
      <h3 className={styles.headline} id={headingId}>
        {block.headline}
      </h3>
      {block.body && <p className={styles.body}>{block.body}</p>}
      {block.linkUrl && block.linkLabel && (
        <a
          className={styles.link}
          href={block.linkUrl}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <span>{block.linkLabel}</span>
          {external && (
            <>
              <span className={styles.srOnly}>, opens in a new tab</span>
              <ArrowUpRight className={styles.arrow} weight="bold" aria-hidden="true" />
            </>
          )}
        </a>
      )}
    </article>
  );
}
