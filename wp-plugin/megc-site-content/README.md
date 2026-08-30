# MegC Site Content — WordPress plugin

Registers the megcmusic.com site-content field groups (from `acf-json/`) and pings GitHub to rebuild the Next.js site when a site-content page is saved. Part of the Sprint-11 Total WordPress Editability Overhaul (`stages/03-build/sprint-11-wp-editability/CONTEXT.md`).

## What it does

- **Field groups.** Adds `acf-json/` as a Local JSON load point. Secure Custom Fields (or ACF) loads the 12 groups automatically — nothing is click-configured, every field definition is code-reviewed here.
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
