/**
 * Single source for the WordPress / WooCommerce host origin.
 *
 * Today's model: WordPress + WooCommerce + The Events Calendar all live at the
 * apex `megcmusic.com` (Bluehost), and the Next front-end runs on a Vercel
 * preview — so the default below keeps every REST base and every outbound
 * WP-page link pointing at the apex, exactly as before.
 *
 * At the launch cutover the Next site TAKES `megcmusic.com`, so WordPress must
 * move to its own subdomain (Meghan's admin/edit surface, e.g.
 * `https://admin.megcmusic.com`). Set `NEXT_PUBLIC_WP_ORIGIN` to that subdomain
 * in Vercel and rebuild — every consumer here follows in one step; no code edit
 * at flip time.
 *
 * `NEXT_PUBLIC_` so the value is readable in BOTH server (ISR prerender) and
 * browser (residential-IP fallback, checkout hand-off) code paths. Like all
 * NEXT_PUBLIC_ vars it bakes at build — a change needs a rebuild, not a restart.
 */
export const WP_ORIGIN =
  process.env.NEXT_PUBLIC_WP_ORIGIN ?? "https://megcmusic.com";
