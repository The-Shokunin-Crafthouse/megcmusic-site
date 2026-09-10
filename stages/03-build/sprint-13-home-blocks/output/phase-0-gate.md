# Phase 0 — The human gate: plugin re-upload (runner: Levi, residential IP)

The only step in Sprint 13 that a human does. Everything in Phases 1–3 is verified at the destination after this clears.

## Click path (README steps 2 + 6, plugin 1.3.0)

1. On this branch (or `main` after the Phase 0 PR merges), zip the folder so the archive contains `megc-site-content/megc-site-content.php`:
   ```bash
   cd wp-plugin && rm -f megc-site-content.zip && zip -r megc-site-content.zip megc-site-content -x '*.DS_Store'
   ```
2. wp-admin → Plugins → Add New → **Upload Plugin** → choose `megc-site-content.zip` → Install Now → WordPress says a version is already installed → **Replace current with uploaded** → Activate stays on.
3. wp-admin → Plugins: "MegC Site Content" shows **Version 1.3.0**.
4. wp-admin → Pages → **Home** → the field tabs now end with **Blocks**, showing "Add a block". Do not add one yet.

## Verification (runner: the building session, after Levi says step 4 is done)

```bash
curl -s "https://admin.megcmusic.com/wp-json/wp/v2/pages/4?acf_format=standard&_fields=acf" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d).acf;console.log(Object.keys(a).filter(k=>!k.endsWith('_source')).join(' '));console.log('home_blocks:',JSON.stringify(a.home_blocks))})"
```
Expected: the existing 18 keys plus `home_blocks`, with `home_blocks: false` (empty) — the same 18 values as before the upload.

| Field | Value |
|---|---|
| Re-upload done (local time) | 2026-09-10, before 13:33 MDT — Levi: "uploaded, 1.3.0 showing, blocks tab is there" |
| Plugin version shown | 1.3.0 (Levi, Plugins list) |
| `acf` keys after | the 18 existing + `home_blocks` + `page_photo` (19 content keys; `page_photo` comes from the shared page-photo group and was already present in the live read) |
| `home_blocks` value | `false` (empty), `home_blocks_source.label` "Blocks", type `flexible_content` |
| Existing values unchanged | **18 of 18** identical to the 2026-09-09 live read (not the committed snapshot, which is older than Meg's 2026-09-08 Recognition edit); `modified_gmt` unchanged at 2026-09-09T15:58:00 — the upload touched no content |

**Gate cleared 2026-09-10 13:33 MDT.** Runner for the read: the building session.

If wp-admin white-screens after activation (the 2026-08-27 class): Bluehost File Manager → `public_html/wp-content/plugins/` → rename `megc-site-content` to `megc-site-content.off` → wp-admin returns → tell the session which log line `public_html/wp-admin/error_log` shows. The change is JSON only and registers no admin hooks, so this is a precaution, not an expectation.
