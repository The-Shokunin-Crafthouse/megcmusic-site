/**
 * The background photo for each page, resolved at build time
 * (Sprint 11 — per-page editable hero).
 *
 * scripts/fetch-hero-images.mjs (first step of `npm run build`) resolves every
 * page's photo — its own ACF `page_photo`, else the site-wide `hero_photo` on
 * the Home page, else the committed file — downloads the original, and writes
 * src/generated/page-hero.json. Pages sharing a photo share one file, so today,
 * with no page overridden, every key points at the committed
 * /images/hero/meghan-hero.jpg and nothing was downloaded twice.
 *
 * A build that cannot read a page, or that downloads something which is not a
 * valid image, fails there with a named cause — it never reaches this module.
 */

import manifest from "@/generated/page-hero.json";

/** Shipped with the repo; also what every page resolves to until Meg sets one. */
const FALLBACK = "/images/hero/meghan-hero.jpg";

/**
 * Page keys match src/generated/page-hero.json. Release detail pages use
 * `release-<wpSlug>` and campaign pages `fyc-<slug>`; an unknown key falls back
 * rather than rendering a broken image.
 */
export function heroImage(key: string): string {
  return (manifest as Record<string, string>)[key] ?? FALLBACK;
}
