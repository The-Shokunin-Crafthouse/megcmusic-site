# Decisions Log

Append-only log of non-trivial decisions made on this project. Entries are not edited in place — if a decision is reversed, a new entry records the reversal and references the original.

## What belongs here

- Decisions with irreversible or cross-cutting consequences
- Trade-offs that took meaningful discussion
- Scope changes, gate bypasses, and deferred items
- Stage closures (Gate 1, Gate 2, Gate 3, Gate 4, Close)
- Retrospective entries at day 14 post-launch

## What does not belong here

- Transient implementation notes → stage `build-notes.md`
- Bugs → `stages/04-review/output/punch-list.md`
- Design exploration → `stages/02-design/claude-design/` or `./figma/`

## Entry format

```
## YYYY-MM-DD — [short title]
**Stage:** [01-brief | 02-design | 03-build | 04-review | 05-launch]
**Type:** [Stack / tech choice | UX / design tradeoff | Architecture | Product / scope call]
**Status:** [proposed | accepted | superseded by <date-title> | reversed]

**Context.** What situation forced the decision. Include relevant constraints — timeline, prior decisions, what would happen if no choice were made.
**Decision.** What was chosen. One sentence, starting with a verb.
**Rationale.** Why — the reasoning behind the choice.
**Alternatives considered.** What else was on the table and why it was ruled out. At least one alternative; if only one option existed, say so.
**Consequences.** Easier: what this simplifies or de-risks. Harder: what this constrains or makes more expensive to change.
```

---

## Entries

<!-- Append new entries below. Newest at the bottom. Do not edit historical entries. -->

## 2026-06-16 — Client project: isolated token system
**Stage:** 01-brief
**Type:** Stack / tech choice
**Status:** accepted

**Context.** megcmusic-site is client work for Meghan Clarisse Cave, not a Shokunin-branded property. The operating rule (WORKSPACE.md §4, "Token source is conditional") requires recording at kickoff which token source governs. The shared design system at `brand.shokunincrafthouse.com` carries studio brand identity that must not leak into client work.
**Decision.** Own an isolated `_config/design-system/token-map.css`; do not consume the Shokunin shared design system; decline Tailwind in favor of CSS custom properties + CSS Modules.
**Rationale.** The client has its own brand — dark plum palette, Lora/Open Sans/Praise/Newsreader, guitar-pick and ★★★ motifs — defined in Figma `908TLdOM0e6xRtnzOj2nNv`. Coupling to the studio system would impose studio identity and create a cross-repo dependency on `brand.shokunincrafthouse.com` for a property that must stand alone. Tailwind's preset scales are a recognizable AI fingerprint (studio anti-default) and conflict with a token-first, Figma-mirrored system.
**Alternatives considered.** (1) Consume the shared design system — rejected: it is studio-branded and would not represent the client. (2) Tailwind for speed — rejected per studio default (opt-in only, written reason required); the token-map + CSS Modules path is the studio default and mirrors Figma one-for-one.
**Consequences.** Easier: client brand evolves independently; no coupling to studio brand releases; raw values confined to one file. Harder: tokens are hand-maintained against Figma rather than inherited; any future shared-system adoption would be a migration.

## 2026-06-16 — Web fonts via Google Fonts @import
**Stage:** 01-brief
**Type:** Stack / tech choice
**Status:** accepted

**Context.** The brand type system — Lora, Open Sans, Praise, Newsreader — must load on every surface from scaffold onward. Studio learnings prefer self-hosting display faces (`self-host-variable-font-axes`, `font-display-optional`) to avoid the visible late-swap re-render.
**Decision.** Load all four families from Google Fonts via a single `@import` in `globals.css` with `display=swap`, for the scaffold and initial sprints.
**Rationale.** All four are standard Google Fonts with no secondary axes in use (no `slnt`/`opsz`/custom requirement), so the primary reason to self-host does not yet apply. A single CDN `@import` is the fastest path to a correct type system during scaffold, and the brief specifies a `globals.css` import.
**Alternatives considered.** (1) Self-host subset woff2 with `font-display: optional` — deferred to the Gate 3 performance pass, where late-swap and CLS are measured and the display faces (Lora, Praise) can be subset and self-hosted if the swap is visible. (2) `next/font/google` — viable, but the brief specifies a `globals.css` `@import`; revisit alongside the self-host decision.
**Consequences.** Easier: type system correct immediately; no font files to manage now. Harder: a render-blocking CDN `@import` and possible swap flash remain until the Gate 3 self-host pass; must be revisited before launch.

## 2026-06-16 — Sprint-2 token additions (nav underline, pill radius, micro motion, focus ring)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The nav + hero design (Figma `39:97` / `39:4`) uses values not yet in `token-map.css`: the cream nav active-underline `#fffcdb`, a 9999px pill radius, a hover/focus micro transition, and a focus ring. `token-map.css` (the logged client source of truth — the `.md` is an unfilled studio template) carried only color/type/spacing. No raw hex or magic numbers may reach shipped code (WORKSPACE §3).
**Decision.** Add four token groups to `token-map.css`: `--mc-nav-underline:#fffcdb`, `--mc-radius-pill:9999px`, `--mc-motion-micro:120ms` + `--mc-ease-out`, and `--mc-focus-ring:#241420`.
**Rationale.** The design uses these values; tokenizing them is the only standard-compliant way to reference them. `--mc-focus-ring` is a dedicated ring value (studio learning #32) separate from the brand accent — the dark plum gives AA contrast on the pink pill where the accent would not.
**Alternatives considered.** (1) Raw hex/px in the CSS Module — rejected, violates the non-negotiable. (2) Reuse `--mc-accent-*` for the focus ring — rejected per learning #32 and AA failure on the pink pill.
**Consequences.** Easier: nav/hero reference tokens only; future surfaces inherit the same ring/motion. Harder: token-map.css now carries radius/motion groups that should eventually mirror back into the `.md` template and Figma.

## 2026-06-16 — Mobile nav: full-width floating pill, no hamburger
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The Figma nav (`39:97`) is specified at desktop only; CONTEXT.md delegates the mobile pattern to the build with a logged decision. Five short links (Home/Shows/Media/Booking/Shop).
**Decision.** Render the nav as a full-width floating pill at ≤768, links in a single centered row, no hamburger.
**Rationale.** The five labels measure ~287px of text+gaps against ~342px inner width at 390 — they fit without truncation. A hamburger is a recognizable template default (slop-blocklist) and adds a JS toggle + overlay for no benefit at this link count; keeping the pill preserves the worn-poster character across breakpoints.
**Alternatives considered.** (1) Hamburger drawer — rejected: unnecessary for 5 short links, adds slop + JS. (2) Horizontal-scroll pill — rejected: hidden links, poor affordance.
**Consequences.** Easier: one nav structure across all breakpoints, no client JS, no overlay. Harder: adding links later forces a reflow strategy (revisit then).

## 2026-06-16 — Previews are Vercel subdomain deploys, not /_previews/[N]/
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted

**Context.** The Sprint-2 brief (a templated command) referenced asset paths and a preview URL of the form `https://[domain]/_previews/[pr-number]/`. That is the studio's Hostinger static-site model (learnings #25–28). This repo deploys previews via `preview-deploy.yml` using `vercel deploy --prebuilt`, serving each PR at its own Vercel subdomain root; `next.config` sets no `basePath`/`assetPrefix`, and the project is ISR-only (static export is out, WORKSPACE §3).
**Decision.** Treat the Vercel preview deployment URL (workflow output) as the canonical preview URL; do not target a `/_previews/[N]/` subdirectory, which does not exist here.
**Rationale.** Vercel previews serve at subdomain root exactly like production — no subdirectory, so the learning-#25 subdirectory trap does not apply. The `/_previews/` path was copied forward from a different host model.
**Alternatives considered.** (1) Introduce a `/_previews/[N]/` basePath — rejected: contradicts the Vercel preview model and ISR hosting, adds needless routing complexity.
**Consequences.** Easier: standard Next/Vercel asset + routing behavior. Harder: the brief's preview-URL line and "must work at /_previews/[N]/" clause are superseded by this entry; asset paths are kept relative regardless, so they remain correct if a subpath is ever introduced.

## 2026-06-16 — Sprint-2 asset strategy: local files, hand-authored pick, exported logo SVG
**Stage:** 03-build
**Type:** Stack / tech choice
**Status:** accepted

**Context.** Hero needs three assets (guitar pick, "Meghan Clarisse" name lockup, background photo IMG_3132). Studio rule + brief: no expiring Figma MCP URLs in shipped code; client direction: images local (not Cloudinary), logo as SVG.
**Decision.** Ship all three as local files under `public/images/hero/` via relative paths: name lockup as the exported vector SVG (Figma page-bg rects stripped), background photo as an optimized JPEG (1500×2000, ~480KB) downsized from the 3024×4032 original, guitar pick as a hand-authored inline tokenized SVG.
**Rationale.** The lockup exports as true vector (one gradient-filled compound path) — satisfies "logo as SVG" with full scalability. The pick is a generic decorative shape whose Figma export came wrapped in page-frame junk; hand-authoring yields a clean `currentColor`-tintable path with no artifacts. Local files remove the Cloudinary dependency and expiring-URL risk entirely.
**Alternatives considered.** (1) Cloudinary — rejected per client direction. (2) Figma raster export of the logo — rejected: not a true SVG. (3) Cleaning the pick's frame-export SVG — rejected: more fragile than a hand-authored silhouette.
**Consequences.** Easier: no external image service, no expiring URLs, tintable pick. Harder: the hand-authored pick is not pixel-identical to the Noun Project source (acceptable for decoration; swap later if needed); the photo is a single JPEG — a `<picture>`/WebP responsive pass is deferred to the Gate-3 perf review.

## 2026-06-16 — Hero decoration: one combined pick+lockup SVG + client landscape photo (supersedes parts of the asset-strategy entry)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** In review the hand-authored pick and the separate name-lockup were independent elements with independent size clamps, so the pink lettering drifted outside the pick at some viewport sizes. The client also supplied a landscape hero photo (`meghan-hero.jpg`) and asked for the logo to sit locked inside the pick.
**Decision.** Replace the two separate decoration elements with a single SVG exported from Figma `39:4` (pick `#4F2C3D` + pink gradient lettering in one viewBox, rotations baked), scaled by one width clamp; and use the client's landscape `meghan-hero.jpg` with `object-position: center` instead of the portrait downscale + per-breakpoint focal point. Supersedes the hand-authored-pick and portrait-photo parts of the 2026-06-16 "Sprint-2 asset strategy" entry.
**Rationale.** One SVG locks the lettering inside the pick at every size with zero drift and is fully faithful to Figma's composition. The landscape photo frames the subject across all breakpoints without focal-point hacks.
**Alternatives considered.** (1) Keep two elements, lock proportions via a fixed-aspect percentage container — workable but less faithful and still two elements. (2) Keep the hand-authored pick — rejected: it caused the drift and is less faithful than the real artwork.
**Consequences.** Easier: locked, faithful composition; simpler Hero markup (one decoration image). Harder: the combined SVG bakes its colors (`#4F2C3D`, the pink gradient) as an asset rather than tokens — acceptable for a brand decoration, but a token change will not propagate into it.

## 2026-06-16 — Sprint-3 scope: Shows section only; hero-pin, detail page, /shows deferred
**Stage:** 03-build
**Type:** Product / scope call
**Status:** accepted

**Context.** Sprint-3 CONTEXT scopes the **Shows section** (tabs + cards, Figma 39:12/39:15). At contract approval the lead added seven requests; three reach past the section: (#5/#7) a full-screen hero pinned until the rows scroll through, then a scroll-release; (#3) a native event **detail page** mirroring her current site; and the "See all shows" destination implying a (#7c) `/shows` listing. The hero is logged "static by intent" (Sprint-2), `preview.ts` only screenshots `/`, and neither the scroll scene nor the detail page has a Gate-2 motion/layout spec.
**Decision.** Ship Sprint 3 as the Shows section mounted on the home page (`/`) below the hero; defer the hero scroll-pin + scroll-release, the native detail page, and the `/shows` listing to their own sprints. Interim: a whole-card click links to the event's existing WordPress page (`event.url`), and "See all shows" links to her live archive `https://www.megcmusic.com/events/` (verified 200; `/shows/` 404s).
**Rationale.** The scroll scene re-opens the Sprint-2 hero and is a GSAP scroll-driven scene that needs its own Gate-2 motion spec; the detail page and `/shows` are new surfaces. The existing WP event page already *is* "the information on her site today," so the interim link delivers the requested behaviour with zero new surface. Mounting on `/` is required for the section to appear in the sprint's preview snapshots.
**Alternatives considered.** (1) Fold all seven in now — rejected: silently crosses Gate 2 for the hero and adds two surfaces with no design spec. (2) Build a native detail route this sprint — rejected: new surface, no Figma, expands scope well past the section. (3) Create `/shows` for See-all — rejected: deferred with the listing sprint; the live archive serves the link today.
**Consequences.** Easier: a clean, shippable Shows section; Sprint-2 hero untouched; no half-specified scroll scene. Harder: three follow-on sprints to schedule (hero scroll-composition, event detail, `/shows` listing); the See-all and card links point off-site until those land.

## 2026-06-16 — Sprint-3 token additions (card surface, divider, type ramp, card max-width)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The show card and tabs (Figma 39:22/39:15) use values absent from `token-map.css`: an 8px card radius, the `0 8px 18px rgba(0,0,0,.55)` drop shadow, a `#b2aba4` divider between time/venue/city on cream, a 700px card width, and four type sizes (12/16/22/32px). No raw hex or ad-hoc font sizes may reach shipped code (WORKSPACE §3); `token-map.css` is the only legal home for raw values.
**Decision.** Add to `token-map.css`: `--mc-radius-card:8px`, `--mc-shadow-card:0 8px 18px rgba(0,0,0,.55)`, `--mc-divider-card:#b2aba4`, `--mc-card-max:700px`, and a type ramp `--mc-text-2xs/-base/-lg/-2xl` (12/16/22/32px). Snap the card's off-grid 19px vertical padding to the 8pt grid (16px, `--mc-space-3`).
**Rationale.** Tokenising is the only standard-compliant way to reference these values; mirrors the Sprint-2 token-additions ADR. `--mc-divider-card` is kept distinct from the existing dark-section `--mc-divider` (`#3f3119`) — different ground, different value. The 19→16px snap honours the 8pt discipline (arbitrary px is a bug) over matching an off-grid Figma value.
**Alternatives considered.** (1) Raw hex/px in the CSS Module — rejected, violates the non-negotiable. (2) Reuse `--mc-divider` for the card rule — rejected: wrong value for cream. (3) Keep 19px padding exactly — rejected: off the 8pt grid for a ~3px nicety.
**Consequences.** Easier: card/tabs reference tokens only; the type ramp is reusable by later sprints. Harder: `token-map.css` keeps accreting groups that should eventually mirror back into the `.md` template and Figma; the card is 6px shorter than Figma (within tolerance).

## 2026-06-16 — "Just Added" tab ordering + whole-card / venue link interaction
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** Figma shows three tabs but `getEvents` only filters upcoming/past — there is no "just added" endpoint. Separately, the lead wants the whole row to open the event while the venue opens Google Maps directions; HTML forbids nesting `<a>` in `<a>`.
**Decision.** Keep all three tabs; implement "Just Added" as upcoming sorted by the live `date` (publish) field newest-first, falling back to Up Next order when `date` is absent. Make the card a single stretched primary link (`titleLink::after { inset:0 }`) to `event.url`, with the venue as a separate Maps link lifted above it (`position:relative; z-index:1`).
**Rationale.** The live tribe payload carries `date` (confirmed: `2026-06-03 19:12:23`), so "Just Added" is real data, not a duplicate of Up Next; the fallback guarantees no fake rows if a payload omits it. The stretched-link + raised-secondary-link pattern is the standard accessible way to have a block-level click target with one nested exception.
**Alternatives considered.** (1) Drop to two tabs — rejected: less faithful to Figma; the data supports three. (2) Wrap the card in an anchor — rejected: invalid nested-anchor HTML, breaks the venue link. (3) JS click handler on the card — rejected: not keyboard/SR-native, loses real link semantics.
**Consequences.** Easier: three faithful tabs on real data; native link semantics for both targets. Harder: "Just Added" ordering depends on a field outside the typed contract (added as optional `date?`); the stretched link slightly impairs text selection within the card (acceptable trade).

## 2026-06-16 — Venue red gets a darker text-only `-ink` token (AA on cream)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** The Figma venue colour `#d13e5b` measures **3.9:1** on the cream card `#f7eadd` — below the 4.5:1 AA floor for 16px regular text (the venue is also a link, so legibility matters doubly). AA on body copy is a project non-negotiable (WORKSPACE §3); the known risk was flagged in the Sprint-3 contract.
**Decision.** Add `--mc-accent-red-ink:#bb314f` (**4.85:1** on cream) and use it for venue link text; keep `--mc-accent-red` (`#d13e5b`) as the base hue for any future fills/dots/borders.
**Rationale.** Studio learning #56 — a hue tuned as a fill commonly fails as text; the fix is an additive darker `-ink` for text, not a repaint of the base. Zero cascade: nothing else consumes `--mc-accent-red` yet.
**Alternatives considered.** (1) Ship `#d13e5b` as text — rejected: sub-AA, violates the non-negotiable. (2) Darken the base `--mc-accent-red` itself — rejected: would silently shift any future fill use; the base stays the brand red. (3) Enlarge/bold the venue to clear large-text AA (3:1) — rejected: fights the Figma type spec.
**Consequences.** Easier: venue text passes AA; brand red preserved for fills. Harder: one more red token to keep straight (text → `-ink`, fills → base).

## 2026-06-16 — Bound Events API calls so a slow upstream can't fail the ISR build
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted

**Context.** The first Vercel preview build prerendered `/` (now fetching events) and timed out — "took more than 60 seconds", three attempts, then failed. The API answers in <1s from a normal network and at every page size, so query cost is not the issue; the Vercel build region intermittently cannot reach `megcmusic.com` and the fetch hangs to the 60s static-generation wall. ISR prerenders the page at build by default.
**Decision.** Add a 12s `AbortSignal.timeout` to every Events fetch (`getEvents`, `getEvent`) and raise `staticPageGenerationTimeout` to 120 in `next.config.ts`. The page's existing `try/catch` then renders the empty state instead of hanging.
**Rationale.** A server fetch must never hang a build. Failing fast into the empty state keeps the build green and lets ISR fill real data at runtime, where the serverless fetch path and timeout differ from the build. The committed snapshots prove the populated UI regardless of build-region connectivity.
**Alternatives considered.** (1) `force-dynamic` — rejected: drops ISR (WORKSPACE: ISR only). (2) Reduce `per_page` — rejected: the API is fast at all sizes; size is not the cost. (3) Raise the timeout only — rejected: does not bound a genuine hang, just delays the failure.
**Consequences.** Easier: resilient builds, no new infra coupling, good practice independent of this incident. Harder: if Vercel also cannot reach the WP host at *runtime*, the live preview shows the empty state until connectivity is fixed host-side (datacenter-IP allowlist) — flagged to the lead.

## 2026-06-16 — Card fidelity pass: exact Figma pick vector + 19px padding (supersedes the 8pt snap)
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** Review of the live build flagged three card gaps vs Figma 39:22/39:23: the date did not sit inside the pick (hand-authored silhouette, centred positioning), the vertical padding read wrong (16px vs Figma's 19px), and venue/city were absent. The 2026-06-16 token-additions entry had snapped the 19px padding to 16px for the 8pt grid.
**Decision.** Restore Figma exactly — inline the real 39:24 pick vector path and reproduce the 39:23 badge geometry (pick wrapper 77.281×69.991 at left −1 / top −10, vector 62.861×71.059 rotate −96.04°, month `mb -6`); set card vertical padding to the exact 19px via `--mc-card-pad-y`. Supersedes the 19→16 snap in the token-additions entry. Venue/city is **not** a code change: the render path is correct (verified with a throwaway mock), but the live Events feed has **0/19** upcoming events with a venue assigned (4 venues exist in WP, unlinked) — venue/city/maps appear automatically once events are assigned a venue in WordPress.
**Rationale.** The lead directed fidelity to the Figma file; the date-in-pick framing and the 3px padding gap are visible. Decoration geometry (SVG dimensions, rotation, the −1/−10 offsets) is intrinsic to the asset and kept as Figma-exact literals; the single layout value (19px) is tokenised.
**Alternatives considered.** (1) Keep the 8pt snap — rejected: the lead wants Figma fidelity. (2) Keep the hand-authored pick — rejected: it did not frame the date. (3) Parse venue from event titles — rejected: fragile and wrong-prone; surface the data gap instead.
**Consequences.** Easier: the card is 1:1 with Figma; venue/city is ready for real data. Harder: one off-grid card-padding token; the inlined pick path must be re-synced if the Figma vector changes.

## 2026-06-17 — Google Fonts via `<link>`, not CSS `@import` (Turbopack strips external @import)
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted — supersedes the delivery mechanism of the 2026-06-16 "Web fonts via Google Fonts @import" entry

**Context.** Review caught the Lora date numerals rendering in a fallback serif. Investigation: the built CSS contained no Google `@import`, `document.fonts` was empty (0 faces), and the browser made 0 requests to googleapis/gstatic — Next 16's **Turbopack strips external `@import url()`** from `globals.css`. So Lora / Open Sans / Newsreader / Praise never loaded; the whole site rendered system fallbacks from scaffold onward. The SVG hero masked it; the Lora numerals exposed it.
**Decision.** Remove the external `@import` from `globals.css` and load the identical Google Fonts CSS via `<link rel="stylesheet">` (+ `preconnect`) in `app/layout.tsx` `<head>`, keeping `display=swap`. The local `token-map.css` `@import` stays (Turbopack inlines local imports fine).
**Rationale.** A `<link>` reaches the browser verbatim and is the standard build-safe way to pull a third-party stylesheet; it preserves the logged "CDN Google Fonts, self-host deferred to Gate 3" intent and only fixes the mechanism. Confirmed in-browser: 67 faces register, Lora 400/600/700 + Open Sans 400/600/700 load, and Lora measurably differs from the serif fallback.
**Alternatives considered.** (1) Keep the `@import` — rejected: silently stripped, fonts never load. (2) `next/font/google` — the robust idiomatic path and the eventual Gate-3 self-host pass; deferred here to keep the fix minimal and the self-host decision intact.
**Consequences.** Easier: the brand type system actually renders site-wide — also fixes the latent Sprint-2 nav/hero fallback. Harder: a render-blocking external stylesheet + FOUT remain until the Gate-3 `next/font` self-host pass.

## Future requirement — Email-to-event: auto-create venue if name not found
**Stage:** future sprint (email intake)
**Type:** Feature requirement
**Status:** noted — not yet scoped

When the email-to-create-event feature is built, the venue handling must auto-create a new venue record if the venue name in the email doesn't match an existing venue in the system. Do not fail or drop the venue field — create it and link it. Matching should be case-insensitive and trim whitespace.

## 2026-07-01 — Show pipeline: email → WP → Bandsintown via standalone GitHub Action
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted — satisfies the "Future requirement — Email-to-event" note above

**Context.** Meg must add each show twice — WordPress (site source of truth) and Bandsintown, which offers no public write API (dashboard, ticketing-partner auto-detect, or CSV Event Upload only). She wants to add shows from her phone without logging into WP; Levi wants zero ongoing involvement. In-Cowork automation was ruled out by tooling: the Gmail connector is draft-only (cannot send), and the sandbox network allowlist blocks POSTs to megcmusic.com.
**Decision.** Run an unattended GitHub Action (`scripts/show-pipeline/pipeline.mjs`, every 4h) against a dedicated Gmail (`meghanclarisseshows@gmail.com`, IMAP/SMTP app password): Meg emails a deterministic template → event created in WP as **draft** via TEC REST (Application Password) → confirm email with `[MC-id]` subject tag → her YES publishes and returns the Bandsintown Event Upload CSV for a drag-and-drop.
**Rationale.** Email becomes the single entry point while WordPress remains the only store — the CSV is generated from the WP record post-publish, so the two systems cannot diverge from the parse. Draft-with-confirm (Levi's call) means nothing goes live without her explicit YES. Deterministic template parsing (Levi's call) needs no API key, costs nothing, and fails loudly instead of guessing. The mailbox is the state store (INBOX = queue, `Pipeline/Processed` = archive, `[MC-id]` = pending-confirm) — no state files. Venues auto-create on no-match with case-insensitive normalized matching, per the future-requirement note above. Pipeline deps are isolated in their own `package.json` so Vercel never installs them.
**Alternatives considered.** (1) Bandsintown as source of truth + site reads BIT API — rejected: inverts the North Star and replaces the tribe data layer Sprint 3 is built on. (2) Cowork scheduled task with tap-to-send drafts — rejected: leaves Levi in the loop; connector and allowlist limits above. (3) Freeform emails with AI parse — declined by Levi in favor of the template. (4) Switching TEC → Events Manager (better headless/MCP story) — rejected: migration cost with no blocking TEC gap; noted as the escape hatch if TEC ever blocks something real.
**Consequences.** Easier: one entry, from her phone; both systems fed; nothing publishes unconfirmed; failures retry and surface via GitHub workflow-failure email only. Harder: Meg must follow the template (the robot re-asks otherwise); BIT upload remains one manual drag-and-drop (their only door); post-publish edits still happen in WP; the pipeline owns Gmail + WP app-password secrets (GitHub Actions secrets, revocable). Amends the operating picture: shows may enter via email; WP remains the store and Meg still never touches code.

## 2026-07-01 — /shows past-shows pagination: backward-walk + same-origin proxy
**Stage:** 03-build
**Type:** Architecture
**Status:** accepted

**Context.** Sprint 4 builds the `/shows` destination: full upcoming list, and a paginated "Show more" past-shows archive. The tribe API sorts strictly ascending by start_date and ignores `order=desc` (confirmed against the live payload); pagination totals live in the body (`total_pages`/`total`) and mirror the `x-tec-totalpages`/`x-tec-total` headers. Past shows must read newest-first, and the archive depth is unknown, so the build must not fetch it whole.
**Decision.** Render the tribe API's LAST past page (reversed) at build and walk toward page 1 on each "Show more"; serve subsequent pages through a same-origin Next route handler (`/api/shows/past`) that fetches server-side and returns each page reversed.
**Rationale.** Reversing the last page yields the newest events without a client-side sort across pages. A same-origin proxy keeps the browser off a cross-origin WordPress call (no CORS surface, upstream URL never exposed) and reuses the existing 12s `AbortSignal` bound so no fetch can hang. Body `total_pages` drives the walk; the client is handed the next page number and stops at 0.
**Alternatives considered.** (1) Client fetches the tribe API directly — rejected: cross-origin CORS + exposes the upstream and bypasses the shared timeout bound. (2) Fetch the whole archive at build — rejected: unbounded build cost as the archive grows (the stated risk). (3) Forward pagination — rejected: the API's ascending order would surface oldest shows first.
**Consequences.** Easier: newest-first with no cross-page client sort; build stays bounded; one bounded code path shared with the section. Harder: the newest page can be partial, so the first "Show more" batch may be smaller than later ones; the client's page math assumes the build-time `total_pages`, refreshed each ISR cycle.

## 2026-07-01 — /shows page header: ★★★ brand motif, no new tokens
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** `/shows` needs a page header the home section doesn't have. The brand carries a ★★★ section-label motif (guitar-pick siblings) but no header pattern existed in code, and the contract expected no new tokens. The studio slop-blocklist bans the centered eyebrow / oversized headline / gray-body "spec-page" pattern.
**Decision.** Ship a left-aligned header — ★★★ (gold, aria-hidden) over a Lora title at the existing `--mc-text-2xl` ramp and an italic Lora lede in `--mc-text-body` — aligned to the 700px card column, using only existing tokens.
**Rationale.** Left-aligned to the card column, ramp-sized (not an oversized jump), warm plum palette (not gray), and a brand motif (not a generic eyebrow) — each choice steers clear of the banned spec-page pattern while giving the destination its own identity. No new token was needed, so the token-map stays untouched.
**Alternatives considered.** (1) Reuse the section's hidden h2 with no visible header — rejected: the destination needs a visible title and the POV calls for "the record". (2) A new display-size token for a bigger title — rejected: the existing ramp reads well and the contract expected no new tokens. (3) Centered header — rejected: matches the slop pattern.
**Consequences.** Easier: distinct page identity with zero token churn; the section component is unchanged except for a padding-neutralizing class. Harder: the header lives in the route's own module, so a future shared page-header would be a small refactor.

## 2026-07-01 — Nav active state becomes route-aware
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** Nav shipped in Sprint 2 with a hardcoded `ACTIVE_HREF = "/"` because no route beyond home existed. `/shows` is the first, so the cream active underline must follow the current route.
**Decision.** Convert Nav to a client component that reads `usePathname()`; home matches exactly, other routes match their own path and sub-paths; prefetch stays off until the remaining routes exist.
**Rationale.** `usePathname` is the idiomatic App-Router source of truth and keeps the active rule in one place. Prefix-matching sub-paths means a future `/shows/<slug>` keeps the tab lit without more work.
**Alternatives considered.** (1) Pass an `active` prop from each page — rejected: pushes routing knowledge into every page and drifts. (2) Keep it static — rejected: the underline would lie on `/shows`.
**Consequences.** Easier: correct active state on every current and future route, single source. Harder: Nav is now a client component (negligible — it is presentational and renders inside server trees).

## 2026-07-02 — Sprint 5: /shows gains search, numbered pagination, page-size
**Stage:** 03-build
**Type:** Product / scope call
**Status:** accepted — supersedes the Sprint-4 out-of-scope note on filtering/search and the "Show more" pagination decision

**Context.** After reviewing the Sprint-4 /shows preview, Levi requested a search field, numbered pagination, and a 20/50/100 page-size dropdown — parity with her current WordPress events archive. Sprint 4 had explicitly put "filtering/search/year grouping" out of scope ("add only via a logged scope decision") and chose a "Show more" append over a page-number widget; the Sprint-4 audit also lists "page-number pagination widget" as an AI-default to avoid.
**Decision.** Add a client-side live search (title/venue/city, scoped to the active tab) and numbered pagination with a 20/50/100 page-size selector on the /shows page variant; load the full upcoming and past lists at build so filtering and paging are instant; retire the "Show more" append and the `/api/shows/past` route handler.
**Rationale.** Levi owns the scope and asked for parity with her existing site, where fans already search and page through dates. Client-side filter/paging is instant and needs no new server surface; loading the full archive at build is safe at the current volume (14 upcoming, ~1 past) and each page fetch stays under the 12s bound. The page-number widget is a deliberate, logged override of the studio anti-default in service of client parity, not a default reached for absentmindedly.
**Alternatives considered.** (1) Keep "Show more" + only add the dropdown — rejected: Levi wants numbered pages. (2) Server-side search/pagination via the tribe API — rejected: slower, reload feel, unnecessary at this volume; revisit if the archive grows large enough that loading all past at build risks the build budget. (3) Hold search out per the Sprint-4 note — rejected: superseded by an explicit request.
**Consequences.** Easier: fans filter and page instantly; matches her current site; one simpler client path (no proxy route). Harder: the whole past archive now loads at build, so if it ever grows very large this must move to server-side search+pagination (the escape hatch); the numbered widget is an accepted deviation from the studio anti-default, tied to this surface only.

## 2026-07-02 — Persistent site chrome + full-screen /shows backdrop
**Stage:** 03-build
**Type:** UX / design tradeoff
**Status:** accepted

**Context.** Levi asked for her logo to be a global element on every page that links home, and for /shows to carry the same full-screen hero photo as the home page. The nav had been rendered per-page and positioned as a hero overlay.
**Decision.** Introduce a `SiteChrome` (logo + nav) mounted once in the root layout so it appears on every route; keep the existing pink-pill nav styling unchanged (stacked under the logo on mobile, logo-left/nav-right on desktop). On /shows, hold the home hero photo as a fixed full-screen backdrop under a top-weighted plum scrim for contrast.
**Rationale.** The layout is the one place that is truly global, so the logo/nav live there and no page re-declares them. Reusing the pill's visual language honors "don't change the design" while making it persistent. A fixed backdrop + scrim gives the immersive photo Levi wanted without sacrificing AA on the cream cards or header copy. The scrim uses `rgb(var(--mc-bg-rgb) / a)` — the space-separated triplet requires the slash-alpha form; the legacy `rgba(triplet, a)` comma form is invalid and renders transparent.
**Alternatives considered.** (1) Add the logo per-page — rejected: not global, drifts. (2) Redesign into a solid header bar — rejected: "don't change the design"; the pill is retained. (3) Photo with no scrim — rejected: header text failed contrast over bright areas of the photo.
**Consequences.** Easier: one global chrome; every page gets the logo/home link; /shows matches the home atmosphere. Harder: on home the persistent logo overlaps the larger hero lockup (redundant but hidden behind the hero art); a new `--mc-bg-rgb` triplet token now exists for scrim composition.

## 2026-07-02 — Per-show add-to-calendar via add-to-calendar-button
**Stage:** 03-build
**Type:** Stack / tech choice
**Status:** accepted

**Context.** Levi asked for add-to-calendar on every show, matching her current events page. The `add-to-calendar-button` web-component package was already a dependency.
**Decision.** Render a per-card add-to-calendar control (Apple/Google/iCal/Outlook/Yahoo) built from the event's date/time/venue, gated behind a `withCalendar` prop on the shared ShowCard so only /shows shows it and home stays unchanged. Register the web component via a client-only dynamic import (it reads `window` on load) and feed it discrete date/time fields from a new `calendarParts` helper, using the event's IANA `timezone` (fallback America/Denver).
**Rationale.** Reuses the installed dependency; the web component is self-contained and themeable. Prop-gating extends ShowCard without forking it (Sprint-4 scope guard) and keeps home stable. Client-only import avoids an SSR `window` crash; `calendarParts` keeps the same regex date handling as the rest of the app (no `new Date`, learning #48).
**Alternatives considered.** (1) `add-to-calendar-button-react` wrapper — rejected: not installed; the vanilla element works via a lazy import. (2) Hand-rolled .ics + Google links — rejected: reinvents a maintained dependency already present. (3) Add it on home too — rejected: not requested; home stays as-is.
**Consequences.** Easier: fans add any show to their calendar at the venue's local time; matches her current site. Harder: a third-party web component now renders inside cards (its own shadow-DOM styling), and its config lives in string attributes typed via a local JSX declaration.
