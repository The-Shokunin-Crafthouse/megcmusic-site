# MegC Site Content — WordPress plugin

Registers the megcmusic.com site-content field groups (from `acf-json/`) and pings GitHub to rebuild the Next.js site when a site-content page is saved. Part of the Sprint-11 Total WordPress Editability Overhaul (`stages/03-build/sprint-11-wp-editability/CONTEXT.md`).

## What it does

- **Field groups.** Adds `acf-json/` as a Local JSON load point. Secure Custom Fields (or ACF) loads the 22 groups automatically — nothing is click-configured, every field definition is code-reviewed here.
- **Rebuild ping.** On save of a tracked page (`megc_site_content_page_ids()` in the plugin file, plus the `site-poetry` page), sends `repository_dispatch` (`wp-content-updated`) to this repo. Leading-edge 60s debounce via a transient — deliberately **not** wp-cron, because this install's cron option intermittently fails to persist (Bluehost logs, 2026-08-27). Save-bursts beyond the window are collapsed by the receiving workflow's GitHub Actions concurrency group.
- **Self-update.** From 1.7.0 the plugin updates itself from this repo's GitHub releases (see below): a merge to main that bumps `Version:` releases the zip and installs it on the live WordPress. Nobody uploads a plugin zip after the one-time 1.7.0 bootstrap.
- **Fails safe.** No SCF/ACF → filters never fire. No wp-config constants → no ping, silently. Any exception in the save hook is caught and logged, never fataled — the 2026-08-27 wp-admin outage class (plugins fataling on admin hooks) is designed out. The update check follows the same rule: any error is logged with the `megc-site-content:` prefix and no update is offered.

## Install (the Phase-1 human gate — one wp-admin visit, residential IP)

1. **Install Secure Custom Fields**: wp-admin → Plugins → Add New → search "Secure Custom Fields" (by WordPress.org) → Install → Activate.
2. **Upload this plugin, once**: download `megc-site-content.zip` from the latest `plugin-v…` release on this repo's Releases page (the release workflow builds it so the zip contains `megc-site-content/megc-site-content.php`) → wp-admin → Plugins → Add New → Upload Plugin → Activate (or *Replace current with uploaded* over an older version). From 1.7.0 every later version installs itself — see *Self-update* below.
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

## Shared sections (1.6.0)

A section whose fields are kept on one page but shown on others gets an editor on every page that shows it. On Home, for example, **Electronic Press Kit — shared with Press Kit** shows the press-kit downloads kept on the Press Kit page; what Meg changes there is saved to the Press Kit page, so there is still one copy. The page that keeps a set says where else it shows, above its first field. Sections whose content is not a field (the Sample Set List and Photos pages' text, Events, Products) are listed with a link under **Sections edited somewhere else**.

What is shared comes from `shared-sections.json`, generated from each section's `source` in `src/lib/page-layouts.ts` by `npm run layout:build` and checked by `npm run layout:check` (CI). Never hand-edit it.

An editor opened before someone changed the same set from another page does not overwrite that change: the set is left as it is, the editor shows a notice straight after the save, and the section shows a note on reload. See decisions.md 2026-09-23. Pure helpers are unit-tested in `tests/shared-sections.test.php`.

## Self-update (1.7.0)

The plugin's `Update URI` header points WordPress at this repo, and `self-update.php` answers WordPress's own update check (`update_plugins_github.com`, WordPress 5.8+, no library) with the newest `plugin-v<version>` GitHub release — only when that version is strictly higher than the one installed, never a downgrade. The repo is public, so the read needs no token; the answer is cached in a transient for six hours (a failed read for fifteen minutes), and *Check again* on Dashboard → Updates drops the cache. The Plugins screen then shows the usual *Update now*, and *View version details* shows the release notes.

Nothing waits for WordPress to notice, because wp-cron is not trusted on this host. `wp-plugin-release.yml` runs on every push to main that touches the plugin:

1. Reads `Version:` from the plugin header. Nothing more happens unless it changed against the previous main commit — a JSON-only edit with no bump ships nothing, so **bump the version to ship**.
2. Runs the plugin's lint and unit tests (`wp-plugin-lint.yml`); a failure releases nothing.
3. Zips the folder (tests left out) so the zip holds `megc-site-content/megc-site-content.php` at the top level, re-reads the zip to prove the layout and the version inside, and takes the release notes from the version-history entry below.
4. Publishes the GitHub release `plugin-v<version>` with the zip attached. Re-running the workflow keeps an existing release.
5. `POST https://admin.megcmusic.com/wp-json/megc/v1/self-update` with the `megc-automation` application password (the `WP_APP_USER` / `WP_APP_PASSWORD` secrets, as `wp-ops.yml`), sent by `scripts/ci/wp-self-update.mjs` with a JSON body — a bodiless POST is answered 406 by the host's Mod_Security before WordPress sees it. The route needs the `update_plugins` capability, runs the same `Plugin_Upgrader` that *Update now* runs, and answers `{ "ok", "updated", "installed", "previous", "latest", "errors" }`. The workflow fails unless `ok` is true and `installed` is the released version; the reply is printed in the run.

A pull request that touches the plugin runs steps 1–3 as a dry run and uploads the zip as a workflow artifact; nothing is released and the live site is never called. *Actions → WP plugin release → Run workflow* with *dry_run* off releases the current main version if it is not released yet and pushes the install — the by-hand "install now".

**Rolling back.** Pick the release to go back to on the Releases page, download its `megc-site-content.zip`, and upload it in wp-admin → Plugins → Add New → Upload Plugin → *Replace current with uploaded*. The updater never downgrades, so the older version stays until a higher one is released; to make the rollback permanent, revert the change on main with a higher version number. Deactivating the plugin in wp-admin stops everything it does (field groups, rebuild ping, front door, self-update) without removing anything.

Pure helpers (tag → version, choosing the release, the newer-only rule, the package-origin check) are unit-tested in `tests/self-update.test.php`; the release path's own steps in `scripts/ci/test/wp-plugin-release.test.sh`.

## Version history

- **1.7.0** (2026-09-23) — self-update: the plugin offers its own newer GitHub releases to WordPress (`Update URI` + `update_plugins_github.com`) and gains `POST /wp-json/megc/v1/self-update`, which the new release workflow calls after every release it publishes on a version bump (see *Self-update* above). The last by-hand upload: per step 2 (Replace current with uploaded). Verify: Plugins screen shows *MegC Site Content 1.7.0*, and `GET https://admin.megcmusic.com/wp-json/megc/v1` lists `/megc/v1/self-update`.
- **1.6.2** (2026-09-23) — the *Live Format* field group is removed: Solo Acoustic (2931) and Full Band (2939) no longer show *Format name* / *One-line description* boxes, because nothing on the site reads them since 1.6.1. Their saved values stay in the database. The two pages leave the rebuild list (a save there no longer rebuilds the site) and their View link now opens `/music`. Re-upload per step 2. Verify: open Solo Acoustic in wp-admin — no *Live Format* box under the editor; its View link opens `megcmusic.com/music`.
- **1.6.1** (2026-09-23) — JSON only: the Music page layout swaps *Live Formats* for *Electronic Press Kit* (the home page's press-kit section), so Music gains a "… — shared with …" box for the press-kit rows and loses the two Live Format boxes. Re-upload per step 2. Verify: open Music — its *Page layout* list offers *Electronic Press Kit*, not *Live Formats*.
- **1.6.0** (2026-09-23) — shared sections: an editor for every shared set on each page that shows it, saved back to the page that keeps it; a guard against saving from an out-of-date page; a links box for sections edited elsewhere (see above). Re-upload per step 2 (Replace current with uploaded). Verify: open Home — three boxes titled "… — shared with …" sit under the page's own fields; change a press-kit row name there, Save, open Press Kit — the row shows the new name.
- **1.5.1** (2026-09-17) — the three old-theme pages the site still linked to are absorbed: Photos → `/media#media-photos`, the two review pages → `/music/<release>/reviews`; the review pages join the rebuild list. Re-upload per step 2.
- **1.5.0** (Sprint 17, 2026-09-17) — ten generated Page layout groups (see above); no PHP change. Re-upload per step 2 (once, with 1.4.x); verify: any tracked page shows a *Page layout* box under its fields, and `GET …/pages/608?acf_format=standard&_fields=acf` carries `layout_epk`.
- **1.4.1** (Sprint 16 Phase 2, 2026-09-17) — JSON only: the Release Reviews repeater gains a *Kind* select (Quote / Accolade); the Music group gains a message saying the editor body is not shown; the Work With Me offering *Detail* says where it renders. Re-upload per step 2 (once, with 1.4.0).
- **1.4.0** (2026-09-17) — the front door: `page_link`, `preview_post_link`, admin-bar and `template_redirect` hooks point WordPress at the live site (see above). Re-upload per step 2; verify by opening any page's "View" link from the Pages list — it opens `megcmusic.com`.

- **1.3.0** (Sprint 13, 2026-09-10) — Home field group gains a "Blocks" tab: the `home_blocks` Flexible Content field with three layouts (announcement, pull quote, video). JSON only; no new hooks. Re-upload per step 2 (Replace current with uploaded); verify per step 6 — `acf` on page 4 gains `home_blocks: false`.
- **1.2.0** (Sprint 11) — field groups for every editing surface; rebuild dispatch on save.
