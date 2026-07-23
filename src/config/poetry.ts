/**
 * "Secrets From a Songbird" — Meg's poetry book landing (/poetry). Marketing
 * copy is curated here from her Shop product description (Levi-editable); the
 * cover resolves live from the product image, and Buy goes to the native product
 * page. Sensitive themes — kept in her own dignified framing, never sensational.
 */
export const POETRY = {
  title: "Secrets From a Songbird",
  subtitle: "A collection of poetry by Meghan Clarisse",
  /** Shop product — cover image source + buy destination. */
  productSlug: "secrets-from-a-songbird",
  buyHref: "/shop/secrets-from-a-songbird",
  lede: "The poems that came long before the songs — never shared, until now.",
  paragraphs: [
    "Secrets From a Songbird gathers original poetry Meghan wrote in her late teens and early twenties and kept to herself for years. In vivid imagery and unguarded emotion, she paints powerful pictures with words and takes readers on an honest, introspective journey.",
    "Written through addiction, unresolved trauma, depression, and anxiety, these poems are where she found beauty and joy anyway. They sit with unworthiness and a deep, threatening loneliness — and, in naming them plainly, begin to find their way toward the light.",
  ],
  /** Small honest note under the CTA. */
  note: "A first edition, straight from Meghan.",
} as const;
