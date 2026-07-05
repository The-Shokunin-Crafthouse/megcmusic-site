"use client";

import { useState } from "react";
import { photonWidth, type ShopImage } from "@/lib/shop";
import styles from "./ProductGallery.module.css";

// Product image gallery. Most products carry a single image; when there are
// several, thumbnails switch the main image. Thumbnails are real buttons
// (keyboard-operable, aria-pressed for the active one); the main image reserves
// a square frame so switching never shifts layout.
export function ProductGallery({
  images,
  name,
}: {
  images: ShopImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className={styles.frame}>
        <div className={styles.fallback} aria-hidden="true">
          ★
        </div>
      </div>
    );
  }

  const current = images[active];

  return (
    <div className={styles.gallery}>
      <div className={styles.frame}>
        <img
          className={styles.main}
          src={photonWidth(current.src, 900)}
          srcSet={`${photonWidth(current.src, 900)} 1x, ${photonWidth(current.src, 1600)} 2x`}
          alt={current.alt || name}
          decoding="async"
          width={900}
          height={900}
        />
      </div>

      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                className={styles.thumb}
                aria-pressed={i === active}
                aria-label={`View image ${i + 1} of ${images.length}`}
                onClick={() => setActive(i)}
              >
                <img
                  className={styles.thumbImg}
                  src={img.thumbnail ?? photonWidth(img.src, 160)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={80}
                  height={80}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
