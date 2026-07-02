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
