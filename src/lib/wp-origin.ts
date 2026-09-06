/**
 * Single source for the WordPress / WooCommerce host origin.
 *
 * Post-cutover model (live): the Next front-end OWNS the apex `megcmusic.com`
 * on Vercel, and WordPress + WooCommerce + The Events Calendar moved to
 * `admin.megcmusic.com` (Meghan's admin/edit surface). The apex now 403s every
 * `/wp-json/*` path — it is served by Next, not WordPress — so the default
 * below points at the subdomain. `NEXT_PUBLIC_WP_ORIGIN` still overrides it.
 *
 * The default matching production is deliberate: if the Vercel env var is ever
 * dropped, the fallback stays on a host that actually answers instead of
 * silently emptying every REST-backed surface (shows, shop, media).
 *
 * `NEXT_PUBLIC_` so the value is readable in BOTH server (ISR prerender) and
 * browser (residential-IP fallback, checkout hand-off) code paths. Like all
 * NEXT_PUBLIC_ vars it bakes at build — a change needs a rebuild, not a restart.
 */
const DEFAULT_WP_ORIGIN = "https://admin.megcmusic.com";
function validOrigin(value: string | undefined): string {
  if (!value) return DEFAULT_WP_ORIGIN;
  try {
    new URL(value);
    return value;
  } catch {
    // A set-but-invalid env value must not poison every WP URL — see
    // src/lib/api/wordpress.ts (same guard, same incident).
    return DEFAULT_WP_ORIGIN;
  }
}
export const WP_ORIGIN = validOrigin(process.env.NEXT_PUBLIC_WP_ORIGIN);
