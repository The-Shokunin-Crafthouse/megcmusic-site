import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api/woocommerce";
import { ProductDetail } from "@/components/Shop/ProductDetail";
import styles from "./product.module.css";

export const revalidate = 86400;

// Fetch once, distinguishing a real 404 (auth OK, no such product → getProduct
// returns null) from a datacenter-IP block (the fetch throws). Only the block
// hands off to the browser fallback; a real 404 renders Next's not-found.
async function loadProduct(slug: string) {
  try {
    return { product: await getProduct(slug), blocked: false };
  } catch {
    return { product: null, blocked: true };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await loadProduct(slug);
  if (!product) {
    return { title: "Shop — MegCMusic" };
  }
  return {
    title: `${product.name} — MegCMusic`,
    description:
      product.shortDescriptionHtml.replace(/<[^>]+>/g, "").trim().slice(0, 160) ||
      `${product.name} from Meghan Clarisse Cave's store.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, blocked } = await loadProduct(slug);

  // Server reached WooCommerce and there is no such product → a genuine 404.
  if (!product && !blocked) notFound();

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
        <ProductDetail initial={product} slug={slug} />
      </main>
    </div>
  );
}
