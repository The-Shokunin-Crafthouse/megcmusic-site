<!-- ============================================================ -->
<!-- CLAUDE.md — REPO-ROOT ADAPTER (thin)                         -->
<!-- ============================================================ -->
<!-- Claude Code auto-loads THIS file (repo root) at session      -->
<!-- start — ICM Layer 0. Studio identity, principles, quality    -->
<!-- bar, stack DEFAULTS, gates, creative defaults, and the       -->
<!-- learnings index load GLOBALLY from ~/.claude/CLAUDE.md        -->
<!-- (which @imports canonical studio-memory). Do NOT restate any  -->
<!-- studio content here — only what is specific to THIS repo,     -->
<!-- plus the repo-local navigation chain. Pointers, not copies.   -->
<!-- ============================================================ -->

# Claude Code — Adapter

You are working inside a Shokunin Crafthouse project workspace. Studio standards load globally (`~/.claude/CLAUDE.md` → studio-memory core + `learnings/INDEX.md`). `WORKSPACE.md` at this repo root is binding for everything project-specific.

## Repo identity

megcmusic-site — headless front-end for **Meghan Clarisse Cave**, a Colorado singer-songwriter. Next.js (App Router, ISR) on Vercel, consuming an existing, unchanged WordPress + WooCommerce + The Events Calendar install at `megcmusic.com` over REST. Surfaces: home, shows, shop + cart/checkout, EPK, media, booking. **Client work — not a Shokunin-branded property.**

## Stack deviations from studio defaults

<!-- Studio defaults live in the global core; only exceptions are listed. -->

- **Data / backend:** existing WordPress + WooCommerce + The Events Calendar via REST — not Supabase/Prisma. No app database.
- **Auth / checkout:** WooCommerce REST + PayPal (existing gateway) — not Clerk. JWT-for-WP added at Sprint 5 only.
- **Design system:** client-isolated `_config/design-system/token-map.css`; does **not** consume the shared design system at `brand.shokunincrafthouse.com` (logged 2026-06-16).
- **Web fonts:** Google Fonts via `@import` in `globals.css` (`display=swap`) — deviates from the studio self-host default; self-host pass deferred to Gate 3 (logged 2026-06-16).
- **Lint:** no ESLint config — Next's default ESLint scaffold declined; studio standard applies.
- Tailwind is **out** (studio default for client work): CSS custom properties + CSS Modules only.

## Repo learnings

Project-specific learnings live in `LEARNINGS.md`. Read at session start; append at sprint close (`sc-learn`). Promote to studio-wide `studio-memory/learnings/` only on the compounding test (will it change how an unrelated future project is built?). Never duplicate studio-wide learnings down into here.

## Required reading (in order)

1. `WORKSPACE.md` — project identity, non-negotiables, operating rules, and the `Current sprint:` pointer
2. `../studio-memory/WORKFLOW.md` — **canonical** stage sequence + approval gates (invariant; referenced, never copied — the repo's `WORKFLOW.md` is a pointer)
3. The active sprint's `CONTEXT.md` — path from the `Current sprint:` field; the sprint contract, **Inputs table**, and pre-output audit checklist
4. Only the files named in that CONTEXT.md **Inputs table** — `_config/` sections loaded selectively, never in full
5. `decisions/decisions.md` — prior decisions; do not reopen without reason

## Behaviors for this workspace

- Treat `WORKSPACE.md` as a binding directive, not background context.
- **Token source is the local client map** — `_config/design-system/token-map.css` governs all color, type, and spacing. Never improvise a value; never reach for the shared design system.
- Decide-and-log: make reversible, in-standard, in-scope calls and log them to `decisions/decisions.md` via `sc-adr`; ask only for scope/money/live-service/brand-direction calls (contract §1).
- When a stage boundary is ambiguous, ask before proceeding — never cross a gate silently.
- Surface ambiguity back to the owning stage. Do not improvise and continue.
- Every new top-level folder requires an update to `workspace.manifest.yaml`.

## What this adapter does NOT contain

Studio content — identity, principles, quality criteria, stack defaults, gates, creative defaults — loads globally via the import chain, not here. Project rules live in `WORKSPACE.md` so they bind every model and contributor. Pointers only.
