import type { Metadata } from "next";
import { getProducts } from "@/lib/api/woocommerce";
import { ProductGrid } from "@/components/Shop/ProductGrid";
import styles from "./shop.module.css";

// Products are low-churn — refresh daily. A new item Meg adds in WooCommerce
// appears on the next ISR cycle (brief: products ISR 24h).
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Shop — MegCMusic",
  description:
    "Records, books, and merch from Meghan Clarisse Cave — CDs, koozies, hats, and more. Ships from her own WooCommerce store.",
};

// The WP host blocks datacenter IPs, so the build/serverless fetch is usually
// blocked; fail fast into an empty list and let the browser fill it from the
// visitor's residential IP (ProductGrid's fallback). Mirrors the events pattern.
async function serverProducts() {
  try {
    return await getProducts();
  } catch {
    return [];
  }
}

export default async function ShopPage() {
  const products = await serverProducts();

  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src="/images/hero/meghan-hero.jpg"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.stars} aria-hidden="true">
              ★★★
            </p>
            <h1 className={styles.title}>Merch &amp; Music</h1>
            <p className={styles.lede}>
              Records, books, and road-worn favorites — packed and shipped by
              Meghan herself.
            </p>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="shop-catalog">
          <div className={styles.inner}>
            <h2 id="shop-catalog" className={styles.srOnly}>
              Products
            </h2>
            <ProductGrid initial={products} />
          </div>
        </section>
      </main>
    </div>
  );
}
