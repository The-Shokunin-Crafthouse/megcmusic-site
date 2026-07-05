# LEARNINGS — <repo name>

> Repo-specific learnings: quirks, gotchas, and stack-specific fixes for THIS project.
> Read at session start (referenced by the Claude Code adapter). Append at sprint close.
> Studio-wide learnings live in `studio-memory/learnings/` (loaded globally via the import chain).
> Promote an entry up to studio scope only if it passes the compounding test — will it change how an unrelated future project is built?

**Format per entry:** `**Title** *(YYYY-MM-DD — sprint/context)*` then what was learned, why it matters, how to apply it.

<!-- Sprint 1 / Sprint 2 — no repo-specific learnings captured at those closes. -->

---

## 2026-06-17 — Turbopack silently strips external CSS `@import url()`
**Context:** Google Fonts were loaded via `@import url('https://fonts.googleapis.com/...')` in `globals.css`. After the Sprint-2 build landed on Vercel the entire type system rendered in system fallbacks — `document.fonts` was empty, zero requests reached googleapis. Investigation confirmed Next.js 16's Turbopack strips external `@import url()` from CSS during the build step; local `@import` (e.g., `token-map.css`) inlines fine.
**Lesson:** Never load a third-party stylesheet via CSS `@import url()` in a Next.js project running Turbopack. Use `<link rel="stylesheet">` + `<link rel="preconnect">` in `app/layout.tsx` `<head>` for third-party CSS (Google Fonts, icon libraries, etc.), or `next/font/*` for font files. The `<link>` reaches the browser verbatim regardless of bundler behavior.
**Trigger:** Any Next.js project on Turbopack (Next 15+/16+) that loads a third-party stylesheet. Also: if fonts look wrong after a Vercel build, check `document.fonts` in-browser before debugging CSS — if it is empty, the import was stripped.

## 2026-06-16 — Bound ISR server fetches with `AbortSignal.timeout` to prevent build hangs
**Context:** First Vercel preview build of the Shows section timed out at the 60s static-generation wall — three attempts, all failed. The Tribe Events API answers in < 1s from a local network; the issue was that the Vercel build region intermittently could not reach `megcmusic.com`, causing the fetch to hang indefinitely rather than reject.
**Lesson:** Every external API call inside a Next.js ISR page must carry `signal: AbortSignal.timeout(N)` (8–12s is a reasonable ceiling). The page's existing `try/catch` then renders the empty state instead of stalling the build. Pair with `staticPageGenerationTimeout: 120` in `next.config.ts` for ISR pages that legitimately run longer. A slow upstream must never be able to stall a deploy.
**Trigger:** Any Next.js ISR page that calls an external or third-party REST endpoint at build time. Apply this pattern at the point the fetch client is written — do not wait to discover the gap in production.

## 2026-06-16 — Tokenize off-grid Figma values rather than snapping when the client has signed off the spec
**Context:** Figma card padding was 19px — 3px off the 8pt grid. The initial build snapped it to 16px (`--mc-space-3`), per studio discipline. Client review flagged the visible gap; the directive was fidelity to the Figma file.
**Lesson:** When a Figma value is off-grid but the client has explicitly approved the design (i.e., Figma IS the signed spec), tokenize the exact value (`--mc-card-pad-y: 19px`) and note the off-grid choice in the token comment. The token enforces consistency across all card instances; a snap creates a silent spec conflict. Grid discipline defers to a client-approved spec.
**Trigger:** Any Figma-to-code fidelity pass where exact Figma values conflict with the 8pt grid. If the client hasn't reviewed yet, snap and flag for review; if the Figma is signed off, tokenize exactly.

## 2026-06-16 — Add a `-ink` token variant when a brand fill color fails AA as text
**Context:** Brand red `#d13e5b` (fill color) measured 3.9:1 on the cream card surface `#f7eadd` — below the 4.5:1 AA floor for 16px regular text. The venue name is a link, making legibility doubly important.
**Lesson:** A fill hue and its text-use hue are separate concerns. When a color used as a fill fails AA at text size, add a paired `-ink` token (`--mc-accent-red-ink: #bb314f`) tuned just dark enough to pass. Keep the base token for fills, borders, and decorations; point all text uses at `-ink`. Never modify the base token to fix a text case — it silently shifts every downstream fill use.
**Trigger:** Any time a brand or accent color is used for both fill and text elements. Spot-check text contrast independently from fill contrast at the token-additions stage.

## 2026-07-05 — Vercel previews come from CI only; never local `vercel deploy`
**Context:** Repeatedly, local `vercel deploy` produced `…-levi-bahns-projects.vercel.app` links that demanded a sign-in even when Levi was logged in. Cause: the real project is under the client team **`meggy-cb-ahn`** (`megcmusic-site.vercel.app`), but Levi's Vercel account is not a member of that team, so the CLI (and the committed `.vercel/project.json`, whose org is a personal account) deploys to a *separate personal project* with Deployment Protection. CI works because `preview-deploy.yml` / `deploy.yml` auth with the team's `VERCEL_*` **secrets**, not that file.
**Lesson:** Never run `vercel deploy` locally for this repo. To preview, push the branch / open the PR and use the **`…-meggy-cb-ahn.vercel.app`** URL from the `preview-deploy.yml` sticky PR comment — that's the only URL Levi/Meg can open, and it's the correct project. Production deploys automatically on merge to `main`. If CI doesn't fire (a webhook hiccup has happened mid-merge), re-trigger with an empty commit or close/reopen the PR — don't CLI-deploy. Don't hand-edit `.vercel/project.json` to fix routing; from Levi's account it can't reach the team, and `vercel deploy` silently rewrites it.
**Trigger:** Any time a Vercel preview/production URL is needed for megcmusic-site.

## 2026-07-05 — Top-anchored route UI must reserve clearance for the fixed SiteChrome
**Context:** The Booking Outreach tab bar was placed at the very top of `/megs-playbook`. On mobile it collided with the global `SiteChrome` — the logo bleeds off the top-left to ~83px and the fixed "Menu" button occupies ~16–60px top-right (both mounted once in the root layout, `position: fixed`/absolute, above content). A 48px top pad put the pills under both. Existing routes never hit this because their headers start low (the playbook header used a 128px top pad).
**Lesson:** Any new UI anchored to the top of a route inherits an overlap with the persistent logo + mobile Menu button. Reserve top clearance on mobile (≥ ~96px / `--mc-space-8` clears the ~83px logo bleed and the Menu button) and drop it back on desktop (`@media (min-width:768px)`) where the centered column + top-right nav don't collide. Verify by reading the logo/Menu bounding rects against your element's top, not by eyeballing a screenshot.
**Trigger:** Adding a header, tab bar, toolbar, or banner at the top of any route in this repo. Check `getBoundingClientRect()` of the logo link and the Menu button at 390px before shipping.

## 2026-07-05 — One route, two callers: field-level guard beats two routes
**Context:** `PATCH /api/outreach/prospects/[id]` is called both by Meg's unguarded page (only "mark handled" → `needs_action`) and by the secret-guarded weekly run (status, cooling, cycle, etc.). Rather than split into two routes, one handler widens the accepted-field allowlist when a valid `x-outreach-secret` is present and 403s the page on any field outside `needs_action`.
**Lesson:** When two callers share a mutation route but differ only in *which fields* they may write, gate at the field level in one handler (allowlist keyed on the caller's auth), not by forking routes or trusting the client to send only permitted fields. The un-secreted caller can't widen its own scope, and there's one place to read the policy. Reject unknown fields explicitly (403 for the page, 400 for the machine) rather than silently dropping them.
**Trigger:** Any endpoint with a privileged and an unprivileged caller writing to the same resource. Extend the response/allowlist (studio learning #60, shared-route-extend-not-swap), never swap the shape per caller.
