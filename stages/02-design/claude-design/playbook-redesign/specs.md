# P5 Design Specs — Proposed Screens 7–10 + Comp Gap Resolutions

Written by the Planner (Fable) in the comps' visual language before implementation.
Every value references a `--pb-*` token (`_config/design-system/token-map.css`);
component vocabulary comes from `stages/02-design/output/playbook-redesign-spec.md` (P1).
Motion philosophy: Systemic Restraint — every motion value below is from the sprint brief §7.

Two surface families (from P1):
- **Browse** (Home/Stats/Booking/Checklist/Library): blurred-photo + plum scrim (`--pb-bg` family), plum-tint cards (`--pb-card-bg`).
- **Creation** (idea → questions → storyboard result): solid dark teal (`--pb-bg-takeover`), raised-teal cards (`--pb-mic-circle-bg` family), cream chrome, Exit bar.

---

## Screen 7 — Storyboard result (creation surface, flow terminus)

The core deliverable. Meghan reads it once, picks a title, copies what she needs, saves it. Arrives streaming: frames appear one by one (60ms stagger, ease-out) inside `GenerationWait` while the job is `streaming`.

### Structure (top → bottom, 24px content inset, gap `--pb-space-section`)

1. **Headline** — "Your storyboard" (`--pb-text-md` Bold, white) — same position formula as the other creation headlines. To its right-aligned baseline: frame count "6 frames" (`--pb-text-2xs`, `--pb-text-muted`).
2. **Title options** (she names the post first — the choice colors how she reads the rest):
   - Eyebrow "Pick a title" (`--pb-text-2xs` Bold, `--pb-teal`).
   - 3–5 selectable cards, gap `--pb-space-tight`. Card: radius `--pb-radius-card`, padding `--pb-space-card`. Unselected: 1px cream border (idea-screen "Generate Storyboard" pill vocabulary), transparent fill; title `--pb-text-sm` SemiBold cream, rationale `--pb-text-2xs` `--pb-text-muted` beneath (2-line clamp). Selected: `--pb-teal` fill, `--pb-teal-ink` title, rationale `--pb-teal-ink` at 70% — the active-chip pattern scaled up. Radio semantics (`role="radiogroup"`), TapScale on press.
   - Below the cards, right-aligned text button "Fresh titles" (`--pb-text-2xs` Bold cream + Phosphor `ArrowsClockwise` 16) — enqueues a `titles` job carrying all previously offered titles; new options replace unselected cards via crossfade 220ms.
3. **Frame cards** — one per frame, gap `--pb-space-card`. Card: fill `--pb-mic-circle-bg` (the raised-teal surface), radius `--pb-radius-card`, padding `--pb-space-card`.
   - Header row: eyebrow "Frame 1 — Hook" (`--pb-text-2xs` Bold, `--pb-teal`; roles: first = Hook, last = CTA, middle = Body) + right-aligned quiet regenerate icon button (`ArrowsClockwise` 16, cream at 70%, 44×44 hit area) — enqueues a storyboard job scoped to this frame (input carries existing frames + index; response replaces only this card, crossfade 220ms).
   - Description: `--pb-text-sm` cream.
   - On-screen text (when non-empty): a quoted line — `--pb-text-sm` SemiBold white, left 2px cream rule inset (`--pb-space-tight` padding-left), prefixed label "On screen" `--pb-text-2xs` `--pb-text-muted`.
   - **Asset prompt** — collapsed `Disclosure`-style row: label "Asset prompt" (`--pb-text-2xs` Bold cream) + `CaretDown` 12. Expanded (220ms ease-out height+fade): prompt text `--pb-text-2xs` `--pb-text-muted` in a `--pb-radius-card` inset with a **tap-to-copy** row — Phosphor `Copy` 16 + "Copy prompt" (`--pb-text-2xs` Bold cream). On copy: 120ms accent flash (TapScale flash prop) and label swaps to "Copied" + `CheckSquare` fill for 1.5s. Entire row is the tap target (44px min).
4. **Caption card** — same raised-teal card: eyebrow "Caption" teal, caption text (hashtags included, as stored) `--pb-text-sm` cream, "Copy caption" tap-to-copy row (same pattern as asset prompt).
5. **Posting window** — single line, no card: `ArrowCircleUp` 16 teal + text `--pb-text-2xs` `--pb-teal`.
6. **Bottom action bar** (pinned above the Exit bar, safe-area aware, `--pb-bg-takeover` fill): **"Save to library"** — the flow's one cream-filled pill (`--pb-cta-bg` fill, `--pb-cta-ink` text, radius `--pb-radius-pill`, padding 16px 24px). Disabled until a title is selected (`aria-disabled`, 50% opacity + explanatory `--pb-text-2xs` line "Pick a title first"). After save: pill swaps (crossfade 220ms) to confirmation "Saved ✓ — View in library" (outline pill) which exits the flow and opens the Library.

### States
- `streaming`: title options render as soon as they arrive; frames stagger in as parsed. Partial content is real content — never blocked behind completion.
- `error`: GenerationWait's retry state — "That one didn't come together." + "Try again" outline pill (re-enqueues with same input).
- Regenerate in-flight: only the affected card/section shows a quiet inline pulse (no full-screen wait).

---

## Screen 8 — Storyboard library (browse surface)

Past storyboards; revisit and duplicate. Entry points: (a) a quiet text row at the bottom of Home — "Storyboard library →" (`--pb-text-2xs` Bold, `--pb-teal`, 44px row); (b) the post-save confirmation on Screen 7. Not in the bottom nav (the nav stays the comped 3+logo).

### Structure (browse chrome: 24px inset, gap `--pb-space-section`)
1. Eyebrow header "Storyboards" (`--pb-text-2xs` Bold, white) — the Booking "Pipeline" label pattern.
2. List of storyboard cards, gap `--pb-space-tight` (Booking's tight rhythm — these are rows, not feature cards): plum-tint card (`--pb-card-bg`, radius `--pb-radius-card`, padding `--pb-space-card`):
   - Chosen title (fallback: idea, 1-line clamp) — `--pb-text-base` SemiBold white (the Booking venue-name scale — the one 16px card-title in the language).
   - Meta row (`--pb-text-2xs`): "6 frames" · date "Jul 12" · posting window (first clause) — joined by `/` separators in `--pb-slash`, values `--pb-text-muted`.
   - Whole row = stretched tap target → opens Screen 7 in **read-only revisit mode** (same layout; regenerate buttons hidden; copy actions live; bottom bar shows "Use as new idea" outline pill instead of Save — seeds idea entry with this storyboard's idea text = the duplicate action).
3. Pagination: none — list newest-first (API caps at 100); beyond one screen just scrolls.

### States
- Empty: ★ divider row (`--pb-divider` glyph pattern) + "Nothing saved yet. Your first storyboard lands here." (`--pb-text-sm`, `--pb-text-muted`) + "Start an idea" outline pill → opens creation flow.
- Loading: two skeleton rows (card-shaped, `--pb-card-bg` pulse at 60% alpha, 450ms ease cycle — reduced-motion: static).
- Error: "Couldn't load the library." + "Retry" text button (`--pb-text-2xs` Bold, `--pb-accent-red`).

---

## Screen 9 — Nav shell + creation-flow chrome (resolves P1's flagged gaps)

1. **Nav icon mapping (locked):** bottom-left pick+lightbulb mark = Home; cluster = `Lightning` (Stats), `Sparkle` (Booking — no Phosphor fediverse glyph; matches the brief's own "sparkle" reading), `ListChecks` (Checklist). Active = `weight="fill"` — **including Checklist** (the comp's outline-on-active is a comp gap, not a pattern).
2. **Take-over screens have no Logo mark.** The comps' ~10.6× off-canvas pick is a Figma paste-scale artifact (P1 trace); the creation surface's only chrome is the headline, mic (idea entry), and Exit bar. Omission is the design.
3. **Creation flow = modal stack over the tabs** (TakeoverModal rise, then StackNavigator pushes): idea → question 1…N (one per push) → generating → storyboard result. Back pops; the tab shell never unmounts underneath.
4. **Progress indication (questions):** text, not a bar (slop-blocklist; precedent: the checklist's "N of 7" line) — "2 of 5" (`--pb-text-2xs`, `--pb-text-muted`) right-aligned on the headline row.
5. **Exit confirm** — BottomSheet (no scrim, snap; spring k400 d25): title "Leave this idea?" (`--pb-text-base` SemiBold white), body "Your draft stays saved on this phone." (`--pb-text-2xs` muted), then three 44px actions: **"Save draft & exit"** (cream-filled pill), "Keep working" (outline pill), "Discard draft" (text button, `--pb-accent-red`). Draft = idea + answers (Zustand persisted slice). Re-entering the idea screen with a draft present shows a one-line restore row: "Pick up where you left off →" (`--pb-teal`, 44px) above a fresh textarea.
6. **Booking "Category" chip picker** — BottomSheet: eyebrow "Category", then one 44px radio row per category from live pipeline data (+ "All"), row = cream label + `CheckCircle` fill teal when selected / `Circle` outline otherwise. Picking closes the sheet and sets the chip label to the category name (chip stays in active-pill state while a category filter is applied).
7. **Booking venue detail sheet** — BottomSheet, snap ~85% viewport, scrollable:
   - Header: venue name (`--pb-text-base` SemiBold white), contacts (`--pb-text-sm`, `--pb-stat-number`), meta row (type teal / city / frequency / category with `--pb-slash` separators) — the pipeline row, promoted.
   - Status line: chip in the active-pill vocabulary — "Needs your reply" (`--pb-teal` fill/ink) when needs_action; otherwise plain text status ("Awaiting reply — follow-up 2 of 3", "Cooling until <month>", "Booked ✓") `--pb-text-2xs` muted, derived from the outreach engine's status/cycle fields.
   - **Outreach history**: reverse-chron list; each item: direction label ("Sent" cream / "They replied" teal, `--pb-text-2xs` Bold) + date (muted) on one line, then a 2-line snippet (`--pb-text-2xs`, `--pb-text-muted`). No card chrome — a 1px `--pb-divider`-colored rule between items.
   - Next action line: one sentence from the follow-up policy ("Next: follow-up 3 of 3, around Aug 12" — computed, honest, no fake precision).
   - Actions: "Open in Gmail" (outline pill, `ArrowSquareOut` 16 — links to the thread) + "Mark handled" (text button, only when needs_action — existing `PATCH /api/outreach/prospects/[id]`).
8. **Home "Why this works?" expandable** (comped as hidden 155:68): tap toggles 220ms ease-out height+fade. Content: "Why this works:" label (`--pb-accent-red` Bold 12px per comp) + up to 3 numbered items (`--pb-wtw-body`, ordered list, 21px hanging indent) — items are `why_this_works` tips matched to the recommendation's context tags (served by `GET /api/playbook/tips`). Link label swaps to "Got it" while open.
9. **Stats "Show Insight" expandable**: same motion; content = one computed comparison line ("Reach 241 — about 2× your recent median", `--pb-text-sm` cream; computed from the post vs the loaded list's median, no new API) + one `stat_insight` tip (`--pb-text-2xs`, `--pb-wtw-body`) tagged to the post's product type.
10. **Checklist IG/FB tabs**: rule cards from `playbook.json` v2 — per rule: action (`--pb-text-sm` SemiBold cream) + insight (`--pb-text-2xs`, `--pb-text-muted`), plum-tint card, gap `--pb-space-tight`. The deep evidence/sources layer intentionally does not ship on this surface (phone context); the JSON keeps it.
11. **Question-type layouts** (engine renders from schema; multiselect is comped, rest designed here in the same vocabulary):
    - `single`: multiselect rows with radio affordance — `Circle` outline cream / `CheckCircle` fill `--pb-success`; selecting auto-advances after 220ms (single answer = the answer).
    - `text_short`: the white paper card (`--pb-input-bg`, radius `--pb-radius-card`) at 96px height, `--pb-text-md` SemiBold `--pb-input-text`.
    - `text_long`: idea-entry card verbatim (200px).
    - `yes_no`: two full-width 70px rows ("Yes" / "No", `--pb-text-base` SemiBold centered) — checklist-row chrome, selected = `--pb-teal` fill + `--pb-teal-ink` text; auto-advance like single.
    - `scale`: five 56px circles in a row (gap `--pb-space-tight`), numerals 1–5 (`--pb-text-sm` Bold); unselected: 1px cream border; selected: `--pb-teal` fill + ink numeral. Pole labels from the question text render under the end circles (`--pb-text-2xs` muted). Min 44px targets with hit-slop.
    - Buttons: "Back" text / "Next" outline pill, justify-between (comp pattern); the last question's primary reads "Generate Storyboard".
    - Required-but-empty: Next is `aria-disabled` with helper line "This one needs an answer" (`--pb-text-2xs`, `--pb-accent-red`) — appears only after an attempted tap.
12. **"Make it better" before/after** (idea entry): job returns → paper card content swaps (crossfade 220ms) to the sharpened idea; beneath the card a compare strip appears: "Why: <one line>" (`--pb-text-2xs`, `--pb-teal`, `Sparkle` 12) then "Before: <original>" (`--pb-text-2xs`, `--pb-text-muted`, italic, 2-line clamp) + actions "Keep it" (small cream-filled pill) / "Put it back" (text button, cream). Keep = accepted text stays editable; Put it back = original restores (crossfade).

---

## Screen 10 — States, empty/error, first-run

**The four async states exist on every data surface.** Loading = shaped skeletons (never spinners): card-silhouette blocks in `--pb-card-bg` pulsing 60%→100% alpha, 450ms ease cycle; reduced-motion: static 80%.

| Surface | Empty | Error |
|---|---|---|
| Home / recommendation | "No recommendation yet today — the morning sync hasn't landed." + "Start your own idea" outline pill (creation flow un-seeded) | "Couldn't reach the playbook." + Retry text button (red-ink) |
| Home / last post | "Stats land after your next post syncs." | same pattern |
| Stats list | "Post stats show up here after the daily sync. Check back tomorrow morning." | same |
| Booking pipeline | "No venues in the pipeline yet — the weekly run fills this list." | same |
| Checklist | never empty (bundled JSON) | n/a |
| Library | (Screen 8) | (Screen 8) |
| Tips (any card) | Card renders with the surface's default line "Fresh tips are on their way." — never a blank card | Hide the tip line (a missing nicety, not an error state) |

Empty states: ★ divider glyph row above the message (brand motif as punctuation), message `--pb-text-sm` `--pb-text-muted`, action as outline pill when one exists.

**First-run screen** (once, before first tab render; plum surface; localStorage flag):
- The pick+lightbulb mark at base scale, centered upper third.
- "Hey Meg." (`--pb-text-md` Bold white) + three lines (`--pb-text-sm` cream): "This is your playbook — your stats, your gigs, your next post, all in one pocket. When you've got an idea, I'll help you build it into a storyboard. Everything here is yours alone."
- **Install card** (shown only when `display-mode` is NOT standalone, i.e. running in Safari): plum-tint card — "Put it on your home screen" (`--pb-text-sm` SemiBold cream) + steps "Tap Share → Add to Home Screen" (`--pb-text-2xs` muted) with Phosphor `Export` glyph inline. In standalone mode the card doesn't render.
- CTA: "Let's look around" (cream-filled pill) → Home.

**Offline** (SW serves shell, fetches fail): one banner row pinned under the safe-area top: "Offline — showing what's cached" (`--pb-text-2xs`, `--pb-text-muted` on `--pb-card-bg`, full-width). Cached tab content renders; actions that need network show their error state on use.

**Focus/keyboard (all new surfaces):** every interactive element: 2px `--pb-focus-ring` ring, 2px offset; sheets trap focus and return it to the opener on dismiss (rAF-deferred when the opener re-mounts — learning #64); Escape/`aria-modal` semantics on TakeoverModal + BottomSheet; expandables are real `<button aria-expanded>`.
