"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import { parsePhotos } from "@/lib/media-photos";
import type { LiveFormat } from "@/config/formats";
import styles from "./music.module.css";

/**
 * One live-format card. The photo lives on Meg's WP format page; the datacenter
 * build can't read WP, so we resolve it from the visitor's residential IP. The
 * card reserves its aspect ratio, so the photo fading in causes no layout shift.
 */
export function FormatCard({ format }: { format: LiveFormat }) {
  const [src, setSrc] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let alive = true;
    fetchPageContentBrowser(format.slug).then((html) => {
      const first = parsePhotos(html)[0];
      if (alive && first) setSrc(first.full);
    });
    return () => {
      alive = false;
    };
  }, [format.slug]);

  return (
    <figure className={styles.format}>
      <div className={styles.formatFrame}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.formatImg}
            src={src}
            alt={`Meghan Clarisse — ${format.label}`}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <figcaption className={styles.formatCaption}>
        <h3 className={styles.formatLabel}>{format.label}</h3>
        <p className={styles.formatBlurb}>{format.blurb}</p>
      </figcaption>
    </figure>
  );
}
