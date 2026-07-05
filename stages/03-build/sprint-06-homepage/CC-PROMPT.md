# CC BUILD PROMPT — MegCMusic site finish (Sprints 6+)

> Run with **Opus 4.8**. Repo: `~/Projects/shokunin-crafthouse/megcmusic-site`.
> Goal: finish the full site today — homepage (all sections), EPK, Media, Booking, Shop — phase by phase, PR per phase.

---

## 0. Session pre-flight (do this before anything)

1. Confirm the primary checkout is on `main` and pulled (`git checkout main && git pull origin main`). If this session runs in a `.claude/worktrees/` copy, that's fine for building — but every new dependency must land in the committed branch's `package.json` + lockfile (run `npm install <pkg>` from the branch root and commit both), or Vercel builds without it.
2. Read, in order: `WORKSPACE.md` → `WORKFLOW.md` → `decisions/decisions.md` → `_config/design-system/token-map.css` → `LEARNINGS.md`. These are directives, not reference.
3. Invoke the **Emil Kowalski animation skill** installed in this Claude Code environment before writing any motion code, and keep it loaded for every phase that animates. If it isn't installed, stop and ask Levi for it — do not substitute your own motion defaults.
4. Figma references (design source of truth):
   - Desktop homepage: https://www.figma.com/design/908TLdOM0e6xRtnzOj2nNv/MegCMusic?node-id=39-2
   - Mobile: https://www.figma.com/design/908TLdOM0e6xRtnzOj2nNv/MegCMusic?node-id=110-2
   - Mobile open menu: https://www.figma.com/design/908TLdOM0e6xRtnzOj2nNv/MegCMusic?node-id=112-191

## 1. Process contract

- **One PR per phase** (below), branched from main, atomic imperative commits. At each phase close: run `scripts/preview.ts` snapshots, post the Vercel preview URL, and pause for Levi's sign-off before the next phase.
- Write a `CONTEXT.md` for this sprint folder from this prompt before building; phases 3–4 get their own `stages/03-build/sprint-0N-*/` folders.
- Every crystallized decision → append to `decisions/decisions.md` (supersede, don't rewrite). Sprint close → repo `LEARNINGS.md` + `build-log.md`.
- **Surface ambiguity, don't resolve it silently.** If the Figma doesn't answer a question, stop and ask.

## 2. Design system — hard rules

- `_config/design-system/token-map.css` is the only legal home for raw values. **No raw hex, px, ms, or ease curves in any component** — extend the token map (with a decisions.md entry, matching the Sprint-2/3 pattern) whenever the Figma introduces a value that isn't tokenized yet. Audit the file first; the teal/glass refresh tokens (2026-07-04 ADR) already exist.
- New sections will need at minimum: section-spacing tokens, a scrim/overlay token for the hero, motion tokens for the entrance choreography (duration + ease + scale/offset amounts), z-index scale tokens (`--mc-z-*` — the logo pin demands an explicit scale, not ad-hoc 9999s), and newsletter form tokens. Name them semantically (`--mc-*`), never by value.
- **Icons: Phosphor only, per-icon imports** (`@phosphor-icons/react` — import each icon from its subpath so only used icons ship; never the barrel import).
- Existing constraints hold: AA contrast minimum (watch light-teal on glass — flagged in the 2026-07-04 ADR), `--mc-focus-ring` for focus (never the accent), five states on every interactive element, 8pt spacing, 44px touch targets, reduced-motion delivers a functional path (content visible and static, never blank or stuck).
- Anti-defaults: glassmorphism + teal borders are logged overrides — fine. Do not introduce new slop (centered hero/subline/CTA stacks, symmetric card grids, numbered step circles, arrow CTAs, testimonial patterns). The newsletter section you design (§4.7) is the highest-risk surface for this — design it from the brand (pick motif, ★★★ labels, Lora/Praise, cream-on-plum), not from a template memory.

## 3. Homepage scroll architecture (Phase 1)

The core scene. GSAP + ScrollTrigger (already studio vocabulary). Build it as one orchestrated system, not per-element hacks.

**Load sequence:**
1. Meg's photo renders fullscreen (this is the LCP element — no animation delay on the image itself; it's there at first paint).
2. The plum overlay (tokenized scrim) fades in over it.
3. Three elements enter, staggered: **logo → main nav → show dates**. NOT the standard fade-up. Each element **scales up slightly as it slides in and fades** — e.g. from ~0.94 scale + offset, settling to 1 with an ease-out that has a hint of overshoot (`--mc-ease-overshoot` exists). Tune the exact values with the animation skill; the feel target is "arriving with weight," unique, not a template reveal. All values tokenized.

**Desktop pin/release:**
- Background photo, logo, and nav stay **fixed** while the visitor scrolls through the homepage show-dates list. The list ends with a **"See all dates"** button (→ `/shows`).
- The release trigger: when that button reaches **48px above the bottom of the viewport** (`--mc-space-6`), everything except the logo releases and scrolls normally with the main content.
- The **top-left logo is always fixed and always the highest z-index element on the page** — it sits on top of everything, on every route, forever. Give it the top slot in the new z-scale.

**Mobile:**
- Logo and nav scroll away with the **first** scroll — only the background photo stays fixed.
- When the See-all button is 48px above the **footer**, the background locks too and everything scrolls as one document.
- Exception to the desktop rule, by explicit direction: on mobile the logo is NOT persistently fixed.

**Reduced motion:** entrance elements simply present (no scale/slide choreography); the pin/release still functions (it's layout, not ornament) unless it causes motion sickness patterns — if unsure, unpin entirely and lay the page out statically.

Note: this supersedes the Sprint-3 "hero static by intent" deferral — log the ADR.

## 4. Homepage sections (Phase 2) — top to bottom per Figma 39:2

Data-layer ground rule: **the WP host blocks datacenter IPs** (2026-07-03 ADR). Any new server-side WP fetch must reuse the existing pattern — bounded fetch (12s abort) + browser-side fallback (`events-browser.ts` is the model). YouTube/Behold/Mailchimp are not WP and are not blocked.

### 4.1 Nav + hero
Already built (glass pill, teal active, SiteChrome). Restyle/integrate only — the scroll architecture in §3 is the change here.

### 4.2 Shows preview
Existing ShowsSection mounts here; it becomes the pinned-scene content with the "See all dates" button appended after the list. Keep the browser fallback intact.

### 4.3 Liner Notes (bio)
- Bio prose from her WP **/about** page (`wp/v2/pages?slug=about`) — ISR + browser fallback; Meg keeps editing in WP.
- Praise-font drop-cap "M", pull-quote (`--mc-bg-quote` exists), and the **Recognition** timeline sidebar (awards + years) per the comp. If award copy isn't in the WP page content, stop and ask Levi rather than inventing it.

### 4.4 Social strip (Instagram)
- **Behold** (behold.so) feed JSON — recent reels + posts, `@meghanclarissecave`. The account is NOT connected yet: build against Behold's documented JSON shape with the feed URL in an env var (`NEXT_PUBLIC_BEHOLD_FEED_ID`), and design the **empty/unconfigured state as a real state** — the section renders the handle + a follow link, no broken grid. It must ship looking intentional today and light up when Levi connects Behold.

### 4.5 Electronic Press Kit
Solo Acoustic / Full Band / Set List rows, thumbnail + Download/View per the comp. Assets from WP media via her **/press-kit** page content — parse the links out of the page so Meg replaces PDFs in WordPress and the site follows. Same fetch pattern as 4.3.

### 4.6 Latest Videos
- **Channel RSS + curated config** (decided): server-side fetch of `https://www.youtube.com/feeds/videos.xml?channel_id=UCCns9wV-KGZI05bsBezql5w` (her channel — `@MeghanClarisse`, verified) for latest uploads, merged with `src/config/videos.ts`:
  - `primaryVideoId` — the featured/hero embed, Levi-editable in the config. Seed: `A8E_XRwkhTk`.
  - `extraVideoIds` — direct URLs/IDs from OTHER channels (live shows posted by venues). Merged into the list.
  - Seed the list with the 9 IDs on her current /videos page: `A8E_XRwkhTk, PJWtlDxvmIc, ABsywqtZp_k, U2rgdUjobD0, SyIj1XDTAiE, WeYjhIiKNiU, xqS1ZpZF7Fc, hwLbMyR4SLw, 0gv7iGWPnXU`.
- **Lazy facade embeds**: thumbnail + play affordance, iframe injected on click (`youtube-nocookie.com`). No nine live iframes — perceived performance is the real performance. Newsreader is the video-caption face.

### 4.7 Newsletter (NEW — design this; no comp exists)
Sits **immediately after the videos section**. Design it yourself, on-brand, per the §2 anti-slop note.

Mailchimp wiring — extracted from her live account (do NOT scrape her /subscribe or /mail WP pages; they're broken scratch-pads):
- Form action: `https://megcmusic.us7.list-manage.com/subscribe/post?u=2d6754f1ba83c5b3076ed55b8&id=4c1d223a0c&f_id=001e08e0f0`
- For inline success/error without leaving the page, POST to the JSONP variant: `.../subscribe/post-json?...&c=<callback>` (Mailchimp's classic endpoint has no CORS; JSONP is the standard client-side path).
- Honeypot field (must ship): `b_2d6754f1ba83c5b3076ed55b8_4c1d223a0c`.
- Fields: **EMAIL + FNAME, both required** (audience requires FNAME — omitting it fails the subscribe). No last name, no birthday.
- None of Mailchimp's CSS or JS. Native tokenized form, five states, written microcopy (label, placeholder, inline error, success confirmation — production copy, no filler), AA on all of it.

### 4.8 Discography
Releases (year, type, title, art) + streaming/Buy links per comp. Pull her WP **/music** page and Woo products, inspect what actually holds release data, choose the source that keeps Meg's edit path in WordPress, and log the ADR.

Her artist profiles (verified — use these for artist-level links; per-release deep links still come from the chosen data source, ask Levi if absent):
- Spotify: `https://open.spotify.com/artist/3iUKOkvtyfkAcg8pOWU5wp`
- Apple Music: `https://music.apple.com/us/artist/meghan-clarisse/1484763484`
- Amazon Music: `https://music.amazon.com/artists/B082L4182W/meghan-clarisse`

### 4.9 Footer
"Request A Gig" → booking route + copyright. Small, but it ships with states and real copy like everything else.

## 5. Boot scroll piece (Phase 2, within homepage)

Recreate the **boot artwork from the Figma homepage comp** ("Country Roots & Cowgirl Boots") as layered vectors and scroll-animate it with GSAP — draw-on strokes, parallax between layers, settle on scroll — so it adds life as the visitor moves through the page. Reach for Three.js only if real depth earns it (log the reason either way; WebGL was pending Gate 2). If you cannot find boot art in node 39-2, **stop and ask Levi** — do not invent artwork.

## 6. Remaining routes (Phases 3–4)

- **Phase 3 — EPK page, Media, Booking:** native routes pulling from `/press-kit`, `/media`, `/photos`, `/contact-me` WP pages (same fetch pattern). Booking is a contact surface — if her current page is a form plugin, decide the headless equivalent and log it.
- **Phase 4 — Shop:** WooCommerce storefront over `wc/v3` (client exists in `src/lib/api/woocommerce.ts`; Zustand for cart per the brief). This is the biggest surface — keep the register consistent with the rest of the site and split it into its own sprint folder + PR. If it threatens the day, ship Phases 1–3 and tell Levi rather than rushing Gate 3.

## 7. Verification (every phase, before presenting)

Run the studio Gate-3 checklist (`/sc-verify` if available in this environment; otherwise apply it manually):
- Motion: durations/eases within studio bands, over-600ms justified in writing, reduced-motion path works.
- AA contrast (light-teal-on-glass explicitly), focus visible via `--mc-focus-ring`, keyboard path through the pinned scene AND the newsletter form, screen-reader sanity on the scroll scene (content order must make sense unpinned).
- All five states on every new interactive element; all four async states (idle/loading/error/empty) on every fetching section.
- LCP < 2.5s (hero photo is LCP — no animation gating it), CLS < 0.1 (facade embeds and lazy sections must reserve space), INP < 200ms.
- Responsive at 390 / 768 / 1024 / 1440 / 1920; snapshots via `scripts/preview.ts`.
- Zero raw values outside `token-map.css` — grep for `#`, `px`, `ms` literals in `src/**/*.module.css` as a final gate.

## 8. Known facts, so you don't re-derive them

- WP REST works and returns content to residential IPs; her real pages: `/about`, `/music`, `/photos`, `/videos`, `/press-kit`, `/media`, `/contact-me`, `/shop`, `/events`.
- Events data + browser fallback already solved — don't touch the pattern.
- Her /subscribe WP page has the classic Mailchimp embed pasted 3×, and /mail holds an mcjs script in a code block — that's the "Mailchimp issue." §4.7 replaces it; the WP pages can be cleaned up by Levi later.
- Fonts load via `<link>` in layout.tsx (Turbopack strips external `@import` — don't regress it). Gate-3 self-host pass is still owed before launch.
- `add-to-calendar-button` is a dependency, gated behind `withCalendar` (only /shows).
- No `new Date` parsing of WP timestamps — string handling per existing `datetime.ts`.

## 9. Open questions — resolve with Levi as they surface

- Award/recognition copy if absent from the /about page.
- Per-release streaming deep links if not in WP/Woo (artist-level links are in §4.8).
- Behold feed ID (Levi connects the account; the section ships with its unconfigured state until then).
