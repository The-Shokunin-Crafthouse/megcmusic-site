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
| Re-upload done (local time) | |
| Plugin version shown | |
| `acf` keys after | |
| `home_blocks` value | |
| Existing 18 values unchanged (diff against `src/generated/wp-content/home.json`) | |

If wp-admin white-screens after activation (the 2026-08-27 class): Bluehost File Manager → `public_html/wp-content/plugins/` → rename `megc-site-content` to `megc-site-content.off` → wp-admin returns → tell the session which log line `public_html/wp-admin/error_log` shows. The change is JSON only and registers no admin hooks, so this is a precaution, not an expectation.
