"use client";

import { useEffect, useRef, useState } from "react";
import { FileArrowDown } from "@phosphor-icons/react/dist/ssr/FileArrowDown";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { FilePdf } from "@phosphor-icons/react/dist/ssr/FilePdf";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import { parseDownloadableAssets, type EpkAsset } from "@/lib/epk-assets";
import type { EpkKitItem } from "@/lib/epk-content";
import styles from "@/app/epk/epk.module.css";

/**
 * Press-kit downloads. The named kits (Solo Acoustic / Full Band / Set List)
 * come from the ACF repeater on Meg's Press Kit page — a row with neither a
 * file nor a link ships a "coming soon" state until she adds the PDF. Below
 * them, any downloadable file actually linked on the /press-kit page surfaces
 * automatically: rendered from the server parse, then augmented in the browser
 * (the WP host blocks datacenter IPs, so a blocked deploy sees none
 * server-side — the visitor's residential IP fills them in).
 */
export function EpkPressKit({
  named,
  serverAssets,
}: {
  named: readonly EpkKitItem[];
  serverAssets: EpkAsset[];
}) {
  const [assets, setAssets] = useState<EpkAsset[]>(serverAssets);
  const ran = useRef(false);

  useEffect(() => {
    // Only reach for the browser fallback when the server parse came back empty
    // (a datacenter-blocked deploy). If the server already found files, keep them.
    if (ran.current || serverAssets.length > 0) return;
    ran.current = true;
    let alive = true;
    fetchPageContentBrowser("press-kit").then((html) => {
      if (!alive) return;
      const found = parseDownloadableAssets(html);
      if (found.length > 0) setAssets(found);
    });
    return () => {
      alive = false;
    };
  }, [serverAssets]);

  return (
    <ul className={styles.kitList}>
      {named.map((item) => (
        <li key={item.title} className={styles.kitRow}>
          <div className={styles.kitMeta}>
            <span className={styles.kitBadge} aria-hidden="true">
              <FilePdf size={26} weight="light" />
            </span>
            <div className={styles.kitText}>
              <h3 className={styles.kitTitle}>{item.title}</h3>
              <p className={styles.kitDesc}>{item.description}</p>
            </div>
          </div>

          {item.href ? (
            <a
              className={styles.kitAction}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.action}
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
            </a>
          ) : (
            <span className={styles.kitSoon} aria-disabled="true">
              Coming soon
            </span>
          )}
        </li>
      ))}

      {assets.map((asset) => (
        <li key={asset.href} className={styles.kitRow}>
          <div className={styles.kitMeta}>
            <span className={styles.kitBadge} aria-hidden="true">
              <FileArrowDown size={26} weight="light" />
            </span>
            <div className={styles.kitText}>
              <h3 className={styles.kitTitle}>{asset.label}</h3>
              <p className={styles.kitDesc}>{asset.kind} download</p>
            </div>
          </div>
          <a
            className={styles.kitAction}
            href={asset.href}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            Download
            <FileArrowDown size={16} weight="bold" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
