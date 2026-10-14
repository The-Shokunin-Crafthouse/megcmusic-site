import { useId } from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import type { Block } from "@/lib/blocks";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./LinksBlock.module.css";

/** A link that leaves the site opens in a new tab; a same-site one does not. */
function isExternal(url: string): boolean {
  if (url.startsWith("/") || url.startsWith("#")) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, "") !== "megcmusic.com";
  } catch {
    return false;
  }
}

/**
 * Links block (2026-10-14) — the FYC page's Listen section with Meg's own
 * heading and buttons: a ★★★ heading, then a wrapping row of pill links, each
 * with the leaving-the-page arrow. Like TextBlock it IS a section — it
 * renders at the page's section rhythm, never inside a block run. Spec:
 * _config/design-system/a11y-spec.md.
 */
export function LinksBlock({ block }: { block: Extract<Block, { layout: "links" }> }) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <SectionLabel id={headingId}>{block.heading}</SectionLabel>
        <div className={styles.links}>
          {block.links.map((l, i) => (
            <a
              key={`${l.url}-${i}`}
              className={styles.link}
              href={l.url}
              {...(isExternal(l.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {l.label}
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
