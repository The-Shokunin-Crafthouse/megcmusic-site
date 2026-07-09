"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { fetchProductBrowser } from "@/lib/api/woocommerce-browser";
import { formatPrice, type ShopProduct } from "@/lib/shop";
import { ProductGallery } from "./ProductGallery";
import { AddToCart } from "./AddToCart";
import { LoadingWave } from "@/components/LoadingWave/LoadingWave";
import styles from "./ProductDetail.module.css";

type Status = "ready" | "loading" | "notfound" | "error";

/**
 * Product detail. When the server render was blocked (datacenter-IP block), the
 * product arrives null and we refetch from the visitor's residential IP via the
 * public Store API. Wires ready / loading / not-found / error states.
 *
 * Add-to-cart is in-app for simple products. Variable products (none exist in
 * the current catalogue — defensive) can't resolve a variation id headlessly,
 * so they hand off to the product's own WooCommerce page to choose options.
 */
export function ProductDetail({
  initial,
  slug,
}: {
  initial: ShopProduct | null;
  slug: string;
}) {
  const [product, setProduct] = useState<ShopProduct | null>(initial);
  const [status, setStatus] = useState<Status>(initial ? "ready" : "loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initial) return;

    let cancelled = false;
    setStatus("loading");
    fetchProductBrowser(slug)
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setProduct(p);
          setStatus("ready");
        } else {
          setStatus("notfound");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [initial, slug, attempt]);

  if (status === "loading") {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        <LoadingWave />
        <p className={styles.stateText}>Loading this item…</p>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className={styles.state}>
        <p className={styles.stateTitle}>This item isn&apos;t here</p>
        <p className={styles.stateText}>
          It may have sold out or been taken down. Browse everything else in the
          shop.
        </p>
        <Link className={styles.stateLink} href="/shop">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (status === "error" || !product) {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.stateTitle}>This item didn&apos;t load</p>
        <p className={styles.stateText}>The store couldn&apos;t be reached just now.</p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={styles.retry}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
          <Link className={styles.stateLink} href="/shop">
            Back to the shop
          </Link>
        </div>
      </div>
    );
  }

  const isSimple = product.type === "simple";
  const onSale =
    product.onSale && product.regularPriceMinor > product.priceMinor;

  return (
    <article className={styles.detail}>
      <Link className={styles.back} href="/shop">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        Shop
      </Link>

      <div className={styles.layout}>
        <div className={styles.galleryCol}>
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className={styles.info}>
          <h1 className={styles.name}>{product.name}</h1>

          <p className={styles.price}>
            {onSale && (
              <span className={styles.wasPrice}>
                {formatPrice(product.regularPriceMinor, product.currency)}
              </span>
            )}
            <span className={onSale ? styles.salePrice : undefined}>
              {formatPrice(product.priceMinor, product.currency)}
            </span>
          </p>

          <p className={styles.stock} data-out={!product.inStock || undefined}>
            {product.inStock
              ? product.stockText || "In stock"
              : "Sold out"}
          </p>

          {product.shortDescriptionHtml && (
            <div
              className={styles.shortDesc}
              // Trusted, admin-authored WooCommerce content (same trust basis as
              // the WP page HTML the rest of the site renders).
              dangerouslySetInnerHTML={{ __html: product.shortDescriptionHtml }}
            />
          )}

          {isSimple ? (
            <AddToCart product={product} />
          ) : (
            <a
              className={styles.optionsLink}
              href={product.permalink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Choose options on the store
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {product.descriptionHtml && (
        <section className={styles.description} aria-labelledby="product-desc">
          <h2 id="product-desc" className={styles.descHeading}>
            Details
          </h2>
          <div
            className={styles.descBody}
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </section>
      )}
    </article>
  );
}
