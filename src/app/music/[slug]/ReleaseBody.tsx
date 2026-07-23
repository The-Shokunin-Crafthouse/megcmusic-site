"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import {
  parseReleaseContent,
  type ReleaseContent,
} from "@/lib/release-content";
import styles from "./release.module.css";

/**
 * The WP-sourced half of a release page — the description and the liner/lyric
 * sheets. The datacenter build can't read WP, so when the server content comes
 * back empty we refetch from the visitor's residential IP (mirrors the photo
 * gallery). Lyric cards are her existing images; text lyrics would appear here
 * too if she adds them as text on the WP page.
 */
export function ReleaseBody({
  wpSlug,
  server,
}: {
  wpSlug: string;
  server: ReleaseContent;
}) {
  const [content, setContent] = useState<ReleaseContent>(server);
  const ran = useRef(false);

  useEffect(() => {
    const empty =
      server.paragraphs.length === 0 && server.liner.length === 0;
    if (ran.current || !empty) return;
    ran.current = true;
    let alive = true;
    fetchPageContentBrowser(wpSlug).then((html) => {
      if (alive && html) setContent(parseReleaseContent(html));
    });
    return () => {
      alive = false;
    };
  }, [wpSlug, server]);

  const { paragraphs, liner } = content;

  return (
    <>
      {paragraphs.length > 0 && (
        <section className={styles.section} aria-labelledby="release-about">
          <div className={styles.inner}>
            <SectionLabel id="release-about">About the Record</SectionLabel>
            <div className={styles.prose}>
              {paragraphs.map((para, i) => (
                <p key={i} className={styles.para}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {liner.length > 0 && (
        <section className={styles.section} aria-labelledby="release-liner">
          <div className={styles.inner}>
            <SectionLabel id="release-liner">Liner Notes &amp; Lyrics</SectionLabel>
            <p className={styles.linerNote}>
              Lyric sheets and credits, straight from the record. Tap any sheet
              to open it full size.
            </p>
            <ul className={styles.liner}>
              {liner.map((img) => (
                <li key={img.thumb} className={styles.linerItem}>
                  <a
                    className={styles.linerLink}
                    href={img.full}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.linerImg}
                      src={img.thumb}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <ArrowSquareOut
                      className={styles.linerZoom}
                      size={18}
                      weight="bold"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
