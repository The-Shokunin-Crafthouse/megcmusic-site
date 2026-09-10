# Phase B — Trashed pages (B.2)

Date: 2026-09-10 · Gate: Levi's one line on 2026-09-09, "Yes, trash 3782, 4386, 2936, 1842, 1851" · Runner: the building session via `wp-ops.yml` `trash-pages`

Dry-run first (run 34428443287) to confirm each id resolved to the expected title, slug and status. Then the write (run 34428487949, `confirm=write`). `DELETE /wp/v2/pages/{id}` with no `force` — every page is in Trash, none past it.

| id | title | slug | status before | response | status after |
|---|---|---|---|---|---|
| 3782 | Newsletter Signup | newsletter-signup | publish | HTTP 200 | trash |
| 4386 | Songs From The Sofa | songs-from-the-sofa | publish | HTTP 200 | trash |
| 2936 | Duo | duo | draft | HTTP 200 | trash |
| 1842 | Merch | merch | draft | HTTP 200 | trash |
| 1851 | Refund and Returns Policy | refund_returns | draft | HTTP 200 | trash |

Verified at the destination after the write: each id now answers 401 to the public REST API (trashed pages are readable only with auth), and the public page list dropped from 35 to 33.

**Not trashed — the six ambiguous pages stay exactly as they were:** 47 About, 2946 Band, 3750 Connect (in WP menus), 5590 workshop, 6060 Mail, 6073 Subscribe (possible inbound links). Levi's yes named five ids; nothing else moved.

## Notes for Levi

- WordPress empties Trash after 30 days by cron (`EMPTY_TRASH_DAYS` default). On this install WP-cron is unreliable (2026-08-27 learnings), so the 30-day window is a guarantee in neither direction: the pages may linger longer, or be gone on schedule. Restore from wp-admin → Pages → Trash if any is wanted back.
- Trashing an untracked page does not fire the rebuild dispatch (the plugin's hook filters on the tracked ids), so one production deploy was triggered by hand afterwards (see `phase-b-parity/README.md` for the run id and the re-verification).
