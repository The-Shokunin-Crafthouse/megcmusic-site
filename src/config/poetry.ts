/**
 * "Secrets From a Songbird" (/poetry) — the parts that stay in code.
 *
 * The page's words now come from Meg's WP "Site: Poetry" page, read at build by
 * src/lib/poetry-content.ts. What is left here is the link between the page and
 * her shop: the cover resolves live from the product image.
 *
 * `buyHref` is the DEFAULT for the buy buttons, not their source — the WP
 * `buy_url` field overrides it whenever Meg fills one in (see poetry-content).
 */
export const POETRY = {
  /** Shop product — cover image source + buy destination. */
  productSlug: "secrets-from-a-songbird",
  buyHref: "/shop/secrets-from-a-songbird",
} as const;
