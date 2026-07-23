# Cowork planning prompt — MegCMusic homepage (desktop 39:2)

> Paste into a Cowork planning session. Goal: lock the homepage structure, content, and data sources so Claude Code can build it cleanly. **Plan only — no code.** Output a validated spec + open-questions list.

## Context
MegCMusic is a headless Next.js (App Router, ISR) front-end over an existing WordPress + WooCommerce + The Events Calendar backend at `megcmusic.com`. Client work for Meghan Clarisse Cave, Colorado singer-songwriter. Design lives in Figma `908TLdOM0e6xRtnzOj2nNv`; the desktop homepage is node **39:2**, mobile /shows is **110:2**. The site currently has only a hero + shows section on home, and a `/shows` archive. This plan is the **full homepage** redesign.

## Design system (already confirmed from Figma)
- Dark plum ground `#241420`; cream cards `#f7eadd`.
- **New teal accent:** `#568c89` (fill/border), `#60b1ad` (light teal — links/active/menu), `#0d3333` (text on teal). Glass fill = plum `#3c0f25` @ 40% + `backdrop-blur(13px)`.
- Type: Lora (display), Open Sans (UI), Praise (drop-cap), Newsreader (video captions).
- Motion alive by default; reduced-motion functional. AA contrast min.

## Sections to plan (top → bottom, per 39:2)
For **each** section, decide: content source, data shape, interactions, responsive behaviour, empty/loading states, and whether it's static (MDX/config) or live (WP/Woo/API).
1. **Nav** (glass pill, teal active) + **hero** (photo). Mostly built — confirm restyle only.
2. **Shows** — preview on home (few cards) → full archive on `/shows`. Restyle (teal) in progress separately.
3. **Liner Notes** — bio prose (drop-cap "M"), a pull-quote, and a **Recognition** timeline sidebar (awards + years). Source: where does bio + awards copy live — Sanity? MDX? WP page? Who edits it?
4. **Social strip** — Instagram/video thumbnails + `@meghanclarissecave`. Source: Instagram API (needs token + review), a manual curated set, or an embed? Decide the maintenance story (Meg never touches code).
5. **Electronic Press Kit** — Solo Acoustic / Full Band / Set List rows, each with a thumbnail + Download/View. Source: PDF/asset files (Cloudinary? WP media?). Where does Meg upload/replace them?
6. **Latest Videos** — featured YouTube embed + a list. Source: YouTube channel (API vs. hand-picked IDs). Privacy/perf (lazy embed).
7. **Discography** — releases (year, type, title, art) + Spotify/Apple/Buy links. Source: WooCommerce products? A releases dataset? Streaming links per release.
8. **Footer** — "Request A Gig" (→ booking) + copyright.

## Hard constraints
- **Meg never touches code, Vercel, or REST keys.** Every editable surface must map to something she manages (WordPress/Woo/TEC) or a clearly-owned CMS. Flag anything that would require a developer to update.
- **WP blocks datacenter IPs** — server fetches from Vercel/CI return empty; live data must have a browser-side fallback (already true for events). Factor this into any new live data source.
- ISR only (no static export). Perceived-performance first (lazy media, no layout shift).
- Studio anti-defaults: the design intentionally uses glassmorphism + outlined buttons — log the override; don't reintroduce other slop (centered hero/subline/CTA, symmetric card grids, etc.).

## Deliverables from the planning session
1. A section-by-section spec: content source + data model + interactions + responsive + states, per above.
2. A **data-source decision** for each dynamic section (Liner Notes, Social, EPK, Videos, Discography) — with Meg's editing path named.
3. A **sprint breakdown** (which sections ship together; dependencies; what's blocked on assets/APIs).
4. An **open-questions list** for Levi (copy, assets, API access, streaming links, award data).
5. Confirm the home-vs-/shows split (home = shows preview, /shows = full archive).

Do NOT write code. End with the validated spec + open questions so Claude Code can build from it.
