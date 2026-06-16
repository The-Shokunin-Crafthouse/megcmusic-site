# /sync-figma-token
## Shokunin Crafthouse Design Token Sync Skill

**Location in project:** `_config/design-system/sync-figma-token.md`
**Location in template:** `studio-memory/templates/project-template/_config/design-system/sync-figma-token.md`

This skill brings the build's design tokens into 1:1 alignment with Figma, which is always the source of truth. It runs in three phases: first it **closes loose ends** — detects un-systematized elements on the design page (raw colors, freehand-styled text, one-off elements that should be components) and promotes them into proper variables, text styles, and components via `use_figma`; then it **extracts everything** from the file-scoped sources (the variable collection for colors/spacing, the file's text styles for typography, the Components page for component variants); then it **syncs** the full token set to `_config/design-system/token-map.md`. Because variables and styles are file-scoped rather than page-scoped, extraction works regardless of which page the design lives on — Sandbox or Production. Always a full 1:1 sync — never partial. On first run it does a clean extraction; on subsequent runs it performs drift detection. The run never pauses for input; everything it auto-promotes or cannot fully resolve is reported at the end for review.

---

## When to run this skill

| Trigger | Mode |
|---|---|
| Brand system approved for the first time (Step 7C) | Clean extraction — no existing token-map.md |
| You've changed colors, type, or spacing in Figma mid-project | Drift detection — token-map.md exists |
| You've left loose elements on the Sandbox page that need systematizing | Promote-then-sync (Phase 1 runs automatically) |
| Evaluator flags a token mismatch between Figma and code | Drift detection |

---

## How to invoke

In Claude Code, paste one of these prompts:

**First-time extraction:**
```
Run the sync-figma-token skill from _config/design-system/sync-figma-token.md.

Figma file URL: [paste Figma file URL]

No existing token-map.md — skip drift detection and do a clean extraction.
```

**Drift detection (token-map.md already exists):**
```
Run the sync-figma-token skill from _config/design-system/sync-figma-token.md.

Figma file URL: [paste Figma file URL]

token-map.md exists — run drift detection before updating. Show me what's changed before overwriting.
```

**Promote-then-sync (loose elements on the design page):**
```
Run the sync-figma-token skill from _config/design-system/sync-figma-token.md.

Figma file URL: [paste Figma file URL]
Design page to scan for loose elements: [e.g. "Sandbox"]

Close any loose ends first (auto-promote per design-system conventions), then sync everything.
```

If no design page is named, Phase 1 defaults to scanning the **Sandbox** page for loose elements. Phase 1 runs on every invocation regardless of which prompt is used — if it finds nothing loose, it reports "no loose elements found" and proceeds straight to extraction.

---

## Step-by-step instructions for Claude

This skill runs in three phases: **Phase 1** closes loose ends (writes to Figma), **Phase 2** extracts tokens (reads Figma), **Phase 3** syncs to token-map.md (writes the file). It never pauses; review happens via the report at the end.

---

### Step 1 — Phase 1: Close loose ends (promote, never pause)

Figma is the source of truth, so before extracting tokens the file must be fully systematized. This phase writes to Figma via `use_figma` — load the `figma-use` skill first and follow Section W of the canonical `figma-furl-core.md` (studio root `.claude/skills/figma-skills/`) for the write mechanism and Plugin API gotchas. (This is the same write path the figma-furl builders use; do not duplicate its rules here, follow the core file.)

**Scan the design page** named in the invocation (default: Sandbox). Resolve its node id via `get_metadata` (no nodeId → page list → match by name). Read it with `get_design_context` and identify loose elements:

- **Loose color** — a fill applied as raw hex/rgba that does not reference a variable.
- **Loose text** — a text node with freehand type settings not bound to a text style.
- **Loose element** — a styled frame/box that recurs or is a clear structural pattern (card, row, button, pill) but is not yet a component instance.

**Auto-promote each loose element (option b — no pause):**

| Loose element | Promote to | Naming |
|---|---|---|
| Raw color | Variable in the existing collection | Existing convention (`color/semantic/…`, `color/surface/…`); if the semantic role is unambiguous from context, name it semantically; if genuinely ambiguous, name at primitive level (`color/primitive/[descriptor]`) and flag it in the report |
| Freehand text | Text style | Existing `type/[role]/[size]` convention |
| Recurring/structural element | Component on the Components page | `[Category]/[Name]/[Variant]` convention |

**State rule for promoted components (option i — never pause):** a loose element shows only its observable state. Promote it with that observable state built to spec, create slots for any missing interactive states (hover/focus/active/disabled) without inventing their styling, and flag the missing states in the report. This mirrors A3-P in the core file. Do not stop to ask.

**Constraints (from core Section E):** never modify existing variable values (add new only); never delete (archive per E2 if something conflicts); build from existing atoms where possible (`search_design_system` first). After promoting, every formerly-loose element on the page is now an instance / variable-bound fill / styled text node.

**If Phase 1 finds nothing loose:** report "no loose elements found" and proceed to Step 2.

Everything promoted is recorded for the Phase-1 section of the final report. The phase never pauses for confirmation.

---

### Step 2 — Phase 2: Read the Figma file (variable-collection-first, page-agnostic)

Resolve the `fileKey` from the Figma file URL. Read tokens from their canonical, file-scoped sources — not from a specific design page. This is what makes the skill work for both Sandbox and Production builds.

**Colors, spacing, and numeric tokens — from the variable collection:**
```
get_variable_defs — fileKey: [from URL]
```
This returns the entire variable collection regardless of which page anything sits on. Extract for each variable:
- Token name (exactly as named in Figma — do not rename or slugify)
- Resolved value: hex (+ opacity if not 100%) for colors; px (or unitless number) for spacing/numeric
- For multi-mode variables (e.g. light/dark), capture the value per mode

**Typography — from the file's text styles:**
Text styles are file-scoped but do not come back through `get_variable_defs`. Read the file's text style list (via the design context read on any frame that uses them, or the file's style enumeration). Extract for each text style:
- Token name (exactly as named in Figma)
- Font family
- Size in px
- Weight (numeric: 400, 500, 700, etc.)
- Line height in px or %
- Letter spacing in px or em

If no text style can be read because none are applied anywhere yet, mark typography as `NONE FOUND — no text styles defined` rather than guessing.

**Component variants — from the Components page:**
Components live on the Components page in the Shokunin structure, regardless of whether the design pages are Sandbox or Production. Resolve the Components page node id:
```
get_metadata — fileKey: [from URL]   (no nodeId → returns page list)
```
Match the page named "Components" from the list, take its node id, then:
```
get_metadata — fileKey: [from URL], nodeId: [Components page id]
```
Extract for each component:
- Component name
- Variant property names and their possible values

If there is no Components page, or it is empty, mark component variants as `NONE FOUND` rather than reading a different page.

**Rule:** Do not infer or guess missing values. If a token has no value in the MCP response, mark it as `MISSING — verify in Figma` rather than estimating. Never read a design page (Sandbox/Production/Brand System) to source tokens — variables, styles, and the Components page are the only sources.

---

### Step 3 — Phase 3a: Drift detection (only if token-map.md exists AND is populated)

Open `_config/design-system/token-map.md`.

**Scaffold check first.** The project template ships `token-map.md` as a partially-filled scaffold: structural sections (spacing, radius, motion, breakpoints) carry real values, but the **Color Tokens and Typography Tokens tables are empty** (header rows only, no data rows). An unfilled scaffold means the design system has not been built yet — treat it as **no prior map** and skip drift detection entirely, proceeding to a clean extraction in Step 4 without pausing for confirmation.

A map is "populated" (drift detection applies) only if the Color Tokens table OR the Typography Tokens table contains at least one data row. If the invoking prompt states the file is an unfilled scaffold, trust that and clean-extract without pausing.

If the map is populated, compare it against the extraction from Step 2.

Report three lists before making any changes:

**ADDED** — tokens present in Figma that are not in token-map.md (new tokens since last sync)

**REMOVED** — tokens present in token-map.md that no longer exist in Figma (deleted or renamed)

**CHANGED** — tokens present in both but with different values (e.g. a color hex changed, a font size changed)

Print this report and stop. Wait for confirmation to proceed with the update. Do not overwrite token-map.md until the user confirms.

If there is no existing token-map.md, or it is an unfilled scaffold (empty Color and Typography tables), skip this step entirely and proceed directly to Step 4 with a clean extraction — no pause.

---

### Step 4 — Phase 3b: Write token-map.md

Write the complete, updated token-map.md to `_config/design-system/token-map.md`.

Use this exact format:

```markdown
# Design Token Map — [Project Name]
# Source: Figma variable collection + text styles + Components page
# Last synced: [date]
# Synced by: sync-figma-token skill

---

## Color Tokens

| Token Name | Hex | Opacity | Notes |
|---|---|---|---|
| color-primary-500 | #1A1A2E | 100% | |
| color-surface-base | #FFFFFF | 100% | |

---

## Typography Tokens

| Token Name | Family | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| type-display-xl | "Inter", sans-serif | 72px | 700 | 80px | -0.02em |
| type-body-md | "Inter", sans-serif | 16px | 400 | 24px | 0 |

---

## Spacing Tokens

| Token Name | Value |
|---|---|
| space-4 | 4px |
| space-8 | 8px |

---

## Component Variants

| Component | Variant Property | Values |
|---|---|---|
| Button | size | sm, md, lg |
| Button | variant | primary, secondary, ghost |

---

## Removed Tokens (kept for reference)

Tokens that were in a previous sync but no longer exist in Figma.
Do not use these in code.

| Token Name | Last Known Value | Removed Date |
|---|---|---|
```

**Rules:**
- Token names must match Figma style names exactly — no renaming, no slugification
- No raw hex values may appear in code — only token names
- If a token was in the REMOVED list, move it to the "Removed Tokens" section with a removal date — do not delete it entirely until you confirm it's unused in code
- This file is the single source of truth for all implementation values
- No color, font, or spacing value gets used in code unless it's in this file

---

### Step 5 — Commit and confirm

After writing token-map.md, the commit is gated — do not commit autonomously without a signal:

- **Interactive session:** show the diff and ask before committing.
- **Unattended run (`/goal` or background):** only commit if the invoking prompt explicitly authorizes it (e.g. "commit when done"). Otherwise write the file and leave it staged-but-uncommitted, noting this in the output so the human commits on review.

When authorized to commit:

```bash
git add _config/design-system/token-map.md
git commit -m "chore: sync design tokens from Figma [date]"
```

Print the commit hash (or "uncommitted — awaiting review" if not committed) and the first 30 lines of token-map.md so the user can verify the format is correct.

**Always print the Phase-1 report alongside the sync output:**

```
## Sync Report — Loose Ends Closed (Phase 1)

### Promoted automatically
| Element (on [page]) | Promoted to | Name assigned | Source value |
|---|---|---|---|

### Ambiguous names flagged (promoted at primitive level — review)
| Element | Name assigned (primitive) | Why ambiguous |
|---|---|---|

### Components promoted with incomplete states (review)
| Component | State built | States slotted but not styled |
|---|---|---|

### Nothing-to-do
[If no loose elements were found, state "No loose elements found on [page] — proceeded straight to extraction."]
```

---

## What this skill does NOT do

- Does not read a design page (Sandbox/Production/Brand System) to *source* tokens — tokens come from the variable collection, the file's text styles, and the Components page. It does *scan* the named design page in Phase 1 to find loose elements to promote.
- Does not modify or rename existing variables, styles, or components — Phase 1 only *adds* (new variables/styles/components) and promotes loose elements. Existing names are canonical and untouched.
- Does not change any code files — only token-map.md.
- Does not invent interactive states it cannot observe — promotes the observable state, slots the rest, and reports them (option i, never pauses).
- Does not pause mid-run for confirmation — everything auto-promoted or ambiguous is reported at the end for review.
- Does not partial-sync — it is always a full 1:1 extraction of every token type.

---

## Companion skill

After tokens are extracted and code is built, sync the Production page in Figma to match what shipped. The build tool is `use_figma` (Plugin API); `generate_figma_design` only captures a reference image — it does not surgically sync an existing page. Use the `figma-furl-production` skill (or `figma-furl-new-production` if no design system exists yet) from the canonical `.claude/skills/figma-skills/` (the project's `_config/figma-skills/` is now a pointer), which runs the correct capture-then-build-with-`use_figma` sequence. See also Section 18 of the Business Runbook.
