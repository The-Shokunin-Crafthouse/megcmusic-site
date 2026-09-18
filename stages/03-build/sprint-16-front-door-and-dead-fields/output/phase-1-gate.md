# Sprint 16 — Phase 1 destination gate (2026-09-17, 21:40 MDT)

Plugin 1.5.0 uploaded by Levi (carries 1.4.0's front door, 1.4.1's field changes, 1.5.0's layout groups). Read from this Mac, signed out:

| Check | Result |
|---|---|
| `GET wp/v2/pages/608?acf_format=standard&_fields=acf` carries `layout_epk` | yes — `false` (field present, empty) |
| `GET wp/v2/pages/4350` reviews rows `kind` | `""` on all four — the 1.4.1 default is gone; the shape rule decides |
| `GET wp/v2/pages/5562?_fields=link` (the `page_link` filter) | `https://megcmusic.com/music` |
| `GET https://admin.megcmusic.com/` | 302 → `https://megcmusic.com/` |
| `GET https://admin.megcmusic.com/music/` | 302 → `https://megcmusic.com/music` |
| `GET https://admin.megcmusic.com/cart/` | 200 on WordPress (WooCommerce keeps serving) |

Meg received the guide (Levi, 2026-09-17). Sprint 16 complete.
