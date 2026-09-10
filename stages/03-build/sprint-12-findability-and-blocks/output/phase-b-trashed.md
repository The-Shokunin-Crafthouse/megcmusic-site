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

## Second batch — 2026-09-10, after Levi resolved the six ambiguous pages

Levi's answers (2026-09-10): the three menu-listed pages — "remove them and trash"; the Mailchimp/link-hub pages — "no [nothing points at them], remove"; the workshop page — "old, remove and trash".

**Menu items removed first** (`remove-menu-items`, dry-run 34428653381, write 34428695647). Menu items have no Trash, so this is a hard delete of the nav rows only. About (4479) in the old theme's live menu was the parent of Photos (5565) and Videos (5564); both were reparented to top level before it went, and the old theme's nav still lists `/photos/` and `/videos/` afterwards (checked on `admin.megcmusic.com`).

| menu item | menu | label | reparented children | result |
|---|---|---|---|---|
| 4479 | 2 "Menu" | About | 5565 Photos → top level · 5564 Media — Videos → top level | deleted |
| 49 | 3 "Pages" | About | — | deleted |
| 2961 | 3 "Pages" | Band | — | deleted |
| 3756 | 3 "Pages" | Connect | — | deleted |

**Pages trashed** (`trash-pages`, dry-run 34428622767, write 34428765679; no `force`):

| id | title | slug | status before | response | status after |
|---|---|---|---|---|---|
| 47 | About | about | publish | HTTP 200 | trash |
| 2946 | Band | band | publish | HTTP 200 | trash |
| 3750 | Connect | connect | publish | HTTP 200 | trash |
| 5590 | An Intimate Songwriting Workshop with Amy Speace… | an-intimate-songwriting-workshop-… | publish | HTTP 200 | trash |
| 6060 | Mail | mail | publish | HTTP 200 | trash |
| 6073 | Subscribe | subscribe | publish | HTTP 200 | trash |

Public page list after both batches: **27** (was 35). Eleven pages in Trash in total; nothing deleted past Trash.
