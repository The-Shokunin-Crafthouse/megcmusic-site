# MegC Site Content — WordPress plugin

Registers the megcmusic.com site-content field groups (from `acf-json/`) and pings GitHub to rebuild the Next.js site when a site-content page is saved. Part of the Sprint-11 Total WordPress Editability Overhaul (`stages/03-build/sprint-11-wp-editability/CONTEXT.md`).

## What it does

- **Field groups.** Adds `acf-json/` as a Local JSON load point. Secure Custom Fields (or ACF) loads the 23 groups automatically — nothing is click-configured, every field definition is code-reviewed here.
- **Rebuild ping.** On save of a tracked page (`megc_site_content_page_ids()` in the plugin file, plus the `site-poetry` page), sends `repository_dispatch` (`wp-content-updated`) to this repo. Leading-edge 60s debounce via a transient — deliberately **not** wp-cron, because this install's cron option intermittently fails to persist (Bluehost logs, 2026-08-27). Save-bursts beyond the window are collapsed by the receiving workflow's GitHub Actions concurrency group.
- **Fails safe.** No SCF/ACF → filters never fire. No wp-config constants → no ping, silently. Any exception in the save hook is caught and logged, never fataled — the 2026-08-27 wp-admin outage class (plugins fataling on admin hooks) is designed out.

## Install (the Phase-1 human gate — one wp-admin visit, residential IP)

1. **Install Secure Custom Fields**: wp-admin → Plugins → Add New → search "Secure Custom Fields" (by WordPress.org) → Install → Activate.
2. **Upload this plugin**: zip the `megc-site-content/` folder (the folder itself, so the zip contains `megc-site-content/megc-site-content.php`) → wp-admin → Plugins → Add New → Upload Plugin → Activate.
3. **Create the PAT** (Levi, on github.com): Settings → Developer settings → Fine-grained tokens → new token scoped to **only** `The-Shokunin-Crafthouse/megcmusic-site`, repository permission **Contents: Read and write** (required by the `repository_dispatch` API — the contract's "contents:read" is not sufficient; see decisions.md), expiry 1 year.
4. **Add the constants** in Bluehost File Manager → `public_html/wp-config.php`, above the `/* That's all, stop editing! */` line:
   ```php
   define( 'MEGC_GH_PAT',  '<the fine-grained PAT>' );
   define( 'MEGC_GH_REPO', 'The-Shokunin-Crafthouse/megcmusic-site' );
   ```
5. **Create the application password** (for Phase-2 migration writes and the show pipeline): wp-admin → Users → the admin user → Application Passwords → name it `megc-automation` → copy the generated password once. It becomes the `WP_APP_USER` / `WP_APP_PASSWORD` GitHub Actions secrets and Phase-2's write credential.
6. **Verify** (from any machine): `https://admin.megcmusic.com/wp-json/acf/v3` should stop returning `rest_no_route`, and `https://admin.megcmusic.com/wp-json/wp/v2/pages/4?acf_format=standard&_fields=acf` should return an `acf` object with the Home fields (empty values until Phase 2 migrates content).

## Verifying the ping

Save any tracked page in wp-admin, then check the repo's Actions tab for a run triggered by `repository_dispatch` (the trigger lands in `deploy.yml` in Phase 4 — until then a dispatch is accepted by GitHub with HTTP 204 and simply matches no workflow). Failures are logged to the PHP error log with the `megc-site-content:` prefix, never surfaced as admin errors.

## The front door (1.4.0)

WordPress's `home` option stays on this host, so on its own it sends "Visit Site", every page's "View" link, and the editor's "Preview" button to the old Storefront theme here — which renders none of Meg's fields. Three hooks fix that without touching `home`/`siteurl` (moving `home` would also move the block editor's REST root, WooCommerce's cart/checkout and Event Tickets' pages onto a host that does not serve them):

- **`page_link` / `preview_post_link`** — a page with a live route (`megc_live_route_for()`, or a release page found through the Music page's *Your releases* rows) links there. Preview shows the *published* page: click Update, wait ~3 minutes, then look.
- **`admin_bar_menu`** — the site name and "Visit Site" open `https://megcmusic.com/`.
- **`template_redirect`** — a visitor who reaches this host's front end is sent (302) to the live page. WooCommerce (shop, product, cart, checkout, account), The Events Calendar and Event Tickets pages, feeds, and any page mapped to `null` keep serving here. `?megc_wp=1` shows the WordPress theme anyway.

Override the live origin with `define( 'MEGC_LIVE_ORIGIN', 'https://…' )` in wp-config for a staging host. The route map is unit-tested (`tests/live-routes.test.php`, run by `wp-plugin-lint.yml` and by hand with `php`).

## Page layout (1.5.0)

Every page Meg edits carries a **Page layout** field group (`layout_<route>`, a Flexible Content list). Its rows are that page's own sections (drag to reorder, toggle *Hide this section*) and five block types (announcement, pull quote, video, text section, photo). Rows she lists render first in her order, sections she leaves out follow in their usual order, and an empty list is today's page. The ten `acf-json/group_megc_layout_*.json` files are **generated** from `src/lib/page-layouts.ts` by `npm run layout:build`; `npm run layout:check` (run by `unit-tests.yml`) fails when they drift. Never hand-edit them.

## Version history

- **1.5.1** (2026-09-17) — the three old-theme pages the site still linked to are absorbed: Photos → `/media#media-photos`, the two review pages → `/music/<release>/reviews`; the review pages join the rebuild list. Re-upload per step 2.
- **1.5.0** (Sprint 17, 2026-09-17) — ten generated Page layout groups (see above); no PHP change. Re-upload per step 2 (once, with 1.4.x); verify: any tracked page shows a *Page layout* box under its fields, and `GET …/pages/608?acf_format=standard&_fields=acf` carries `layout_epk`.
- **1.4.1** (Sprint 16 Phase 2, 2026-09-17) — JSON only: the Release Reviews repeater gains a *Kind* select (Quote / Accolade); the Music group gains a message saying the editor body is not shown; the Work With Me offering *Detail* says where it renders. Re-upload per step 2 (once, with 1.4.0).
- **1.4.0** (2026-09-17) — the front door: `page_link`, `preview_post_link`, admin-bar and `template_redirect` hooks point WordPress at the live site (see above). Re-upload per step 2; verify by opening any page's "View" link from the Pages list — it opens `megcmusic.com`.

- **1.3.0** (Sprint 13, 2026-09-10) — Home field group gains a "Blocks" tab: the `home_blocks` Flexible Content field with three layouts (announcement, pull quote, video). JSON only; no new hooks. Re-upload per step 2 (Replace current with uploaded); verify per step 6 — `acf` on page 4 gains `home_blocks: false`.
- **1.2.0** (Sprint 11) — field groups for every editing surface; rebuild dispatch on save.
