"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import { parsePhotos, type Photo } from "@/lib/media-photos";
import styles from "./PhotoGrid.module.css";

/**
 * The photo gallery: square lazy tiles (CLS-proof — the grid reserves each cell)
 * that open an accessible lightbox. One large image loads at a time. Photos come
 * from the server parse of /photos, with a browser fallback for the datacenter-IP
 * block (mirrors the events/EPK pattern).
 */
export function PhotoGrid({ serverPhotos }: { serverPhotos: Photo[] }) {
  const [photos, setPhotos] = useState<Photo[]>(serverPhotos);
  const [active, setActive] = useState<number | null>(null);
  const ran = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Browser fallback: only when the server parse came back empty (blocked deploy).
  useEffect(() => {
    if (ran.current || serverPhotos.length > 0) return;
    ran.current = true;
    let alive = true;
    fetchPageContentBrowser("photos").then((html) => {
      if (alive) setPhotos(parsePhotos(html));
    });
    return () => {
      alive = false;
    };
  }, [serverPhotos]);

  const isOpen = active !== null;

  const open = useCallback((i: number, el: HTMLButtonElement) => {
    triggerRef.current = el;
    setActive(i);
  }, []);

  const close = useCallback(() => {
    setActive(null);
    // Restore focus to the tile that opened the lightbox.
    triggerRef.current?.focus();
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => {
        if (cur === null) return cur;
        return (cur + dir + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  // Body scroll lock + keyboard controls while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        // Simple focus trap across the three controls in the dialog.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close, step]);

  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        Photos are loading — if they don&apos;t appear,{" "}
        <a
          className={styles.emptyLink}
          href="https://www.megcmusic.com/photos/"
          target="_blank"
          rel="noopener noreferrer"
        >
          view the full gallery on megcmusic.com
        </a>
        .
      </p>
    );
  }

  const current = active !== null ? photos[active] : null;

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li key={photo.thumb} className={styles.cell}>
            <button
              type="button"
              className={styles.tile}
              onClick={(e) => open(i, e.currentTarget)}
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.thumb}
                src={photo.thumb}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          className={styles.lightbox}
          data-open={isOpen ? "true" : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${(active ?? 0) + 1} of ${photos.length}`}
          ref={dialogRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button
            type="button"
            className={`${styles.control} ${styles.close}`}
            onClick={close}
            aria-label="Close"
            ref={closeRef}
          >
            <X size={24} weight="bold" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${styles.control} ${styles.prev}`}
            onClick={() => step(-1)}
            aria-label="Previous photo"
          >
            <CaretLeft size={26} weight="bold" aria-hidden="true" />
          </button>

          <figure className={styles.stage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.full}
              src={current.full}
              alt={current.alt}
              decoding="async"
            />
          </figure>

          <button
            type="button"
            className={`${styles.control} ${styles.next}`}
            onClick={() => step(1)}
            aria-label="Next photo"
          >
            <CaretRight size={26} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
