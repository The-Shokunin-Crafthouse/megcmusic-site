import Link from "next/link";
import { formatPrice, photonWidth, type ShopProduct } from "@/lib/shop";
import styles from "./ProductCard.module.css";

// One product tile in the /shop grid. The whole card is a stretched link to the
// detail page; the image sits in a fixed-aspect frame so the grid never shifts
// as tiles lazy-load (CLS 0). Price shows a struck regular price only when the
// item is genuinely on sale.
export function ProductCard({ product }: { product: ShopProduct }) {
  const image = product.images[0];
  const soldOut = !product.inStock;
  const onSale =
    product.onSale && product.regularPriceMinor > product.priceMinor;

  return (
    <article className={styles.card}>
      <div className={styles.frame}>
        {image ? (
          <img
            className={styles.image}
            src={photonWidth(image.src, 600)}
            srcSet={`${photonWidth(image.src, 600)} 1x, ${photonWidth(image.src, 1200)} 2x`}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            width={600}
            height={600}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            ★
          </div>
        )}
        {soldOut && <span className={styles.soldOut}>Sold out</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link className={styles.link} href={`/shop/${product.slug}`}>
            {product.name}
          </Link>
        </h3>
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
      </div>
    </article>
  );
}
