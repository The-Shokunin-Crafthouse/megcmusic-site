"use client";

import { useEffect, useState } from "react";
import { fetchProductsBrowser } from "@/lib/api/woocommerce-browser";
import { type ShopProduct } from "@/lib/shop";
import { WP_ORIGIN } from "@/lib/wp-origin";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";

// Her live store — the honest destination when the headless fetch can't reach
// WooCommerce, so a visitor is never dead-ended.
const LIVE_SHOP = `${WP_ORIGIN}/shop/`;

type Status = "ready" | "loading" | "empty" | "error";

/**
 * The /shop product grid. Server-rendered products arrive in `initial`; when
 * that's empty (the WP host blocks the datacenter build/serverless IP) the grid
 * refetches from the visitor's residential IP via the public Store API. Wires
 * all four async states: ready (populated), loading, empty, and error.
 */
export function ProductGrid({ initial }: { initial: ShopProduct[] }) {
  const [products, setProducts] = useState<ShopProduct[]>(initial);
  const [status, setStatus] = useState<Status>(
    initial.length ? "ready" : "loading",
  );
  // Bumped to re-run the browser fetch on a manual retry.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Server already delivered products — nothing to recover.
    if (initial.length) return;

    let cancelled = false;
    setStatus("loading");
    fetchProductsBrowser()
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
        setStatus(list.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [initial.length, attempt]);

  if (status === "loading") {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.stateText}>Loading the shop…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.stateTitle}>The shop didn&apos;t load</p>
        <p className={styles.stateText}>
          The store couldn&apos;t be reached just now. Try again, or browse the
          full store directly.
        </p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={styles.retry}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
          <a
            className={styles.stateLink}
            href={LIVE_SHOP}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the full store
          </a>
        </div>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className={styles.state}>
        <p className={styles.stateTitle}>Nothing in the shop right now</p>
        <p className={styles.stateText}>
          New merch and music land here often — check back soon, or visit the
          full store.
        </p>
        <a
          className={styles.stateLink}
          href={LIVE_SHOP}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the full store
        </a>
      </div>
    );
  }

  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product.id} className={styles.cell}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
