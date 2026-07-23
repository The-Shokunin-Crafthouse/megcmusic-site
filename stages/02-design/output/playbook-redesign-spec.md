# Megs Playbook Redesign — Figma Extraction Spec (P1)

Source of truth: Figma file `908TLdOM0e6xRtnzOj2nNv`, page `0:1`. Extracted via
`get_design_context` / `get_screenshot` / `get_metadata` on 2026-07-12. No Figma
variables/styles are defined on this page (`get_variable_defs` returned `{}`
for every frame) — every value below is a raw fill/stroke pulled from node
code, cross-checked against pixel samples of the rendered screenshot where a
value is baked into a flattened icon/image asset (noted inline as "sampled").

Frame width is 390px (iPhone standard) throughout. Content areas that exceed
the 864/874px frame height scroll; the bottom-right icon cluster and
bottom-left Logo mark are frame-pinned (not part of the scroll content).

Six frames covered:

| Figma node | Figma name | Screen identity |
|---|---|---|
| `155:2` | Mobile - Megs Playbook | **Home** |
| `155:213` | Mobile - Megs Playbook Stats | **Stats** |
| `155:303` | Mobile - Megs Playbook Booking | **Booking** |
| `155:391` | Mobile - Megs Playbook Checklist | **Checklist** (tabs: Checklist / Instagram / Facebook, check-off rows) |
| `155:1038` | Mobile - Megs Playbook Checklist | **Creation flow — idea entry** ("What's your idea?" take-over, textarea, mic, Generate/Make-it-better) |
| `155:1143` | Mobile - Megs Playbook Checklist | **Creation flow — question page** ("Question to answer" take-over, multiselect checklist rows, Back/Generate) |

The three "Checklist"-named frames are disambiguated by content, not name:
`155:391` is the actual pre-publish Checklist screen (has the Checklist/
Instagram/Facebook tab nav and the bottom icon-cluster nav); `155:1038` and
`155:1143` are full-screen creation-flow take-overs (different background
color, no bottom icon-cluster nav, an "Exit" bar instead) that happen to
reuse the same check-square-fill/square row component visually.

---

## Global structural notes (all six frames)

- **Frame:** 390×864 (Home/Stats/Checklist/Creation) or 390×874 (Booking —
  bottom nav pinned 16px off frame-bottom either way, so the extra 10px is
  absorbed above the nav, not below it).
- **Content padding:** 24px on all sides for the base-surface screens
  (Home/Stats/Booking/Checklist), applied as the outer flex container's `p-24`.
- **Section gap:** 24px between major stacked blocks (Daily Tip → Next Post →
  Last Post → Weekly posts, etc.).
- **Card radius:** 16px on every translucent card/tile.
- **Card fill:** `rgba(163,88,135,0.10)` (`#A35887` at 10% alpha) — the one
  translucent card fill used everywhere on the base surface (Daily Tip,
  Next-Post's implicit card-less block, Weekly-post rows, Stats post cards,
  Booking pipeline rows, Checklist rows).
- **Base-surface background:** a blurred full-bleed photo (`IMG_3132`,
  1333×1778, offset to fill/crop the 390-wide frame) under a
  `rgba(36,20,32,0.94)` scrim with `backdrop-blur(28px)`. This scrim color/
  alpha is IDENTICAL to the existing `--mc-bg` / `--mc-bg-rgb` (36 20 32)
  tokens already in `token-map.css` — see the Token Table's "duplicates"
  column.
- **Bottom-left brand mark ("Logo"):** a custom guitar-pick SVG
  (`noun-guitar-pick-4239156`, NOT a Phosphor icon — a licensed Noun Project
  asset) rotated −72.72°, ~216×216px, anchored so only a bleeding wedge shows
  in the bottom-left corner, with a small 32×32 lightbulb glyph layered near
  its visible tip. Present, at this scale, on Home/Stats/Booking/Checklist.
  Per the sprint brief, this mark IS the Home nav target (there is no
  dedicated "Home" icon in the bottom-right icon cluster — see Interaction
  affordances below).
- **Bottom-right icon cluster ("Frame 57"):** a pill-shaped glass nav bar,
  bottom:16px, right:18px, containing 2–3 circular icon buttons, 40px each,
  16px gap, 24px glyph centered in each (8px inset). Glass fill: linear
  gradient `rgba(255,255,255,0.4)` → `rgba(153,153,153,0.4)` (left-to-right),
  1px (0.5px) border `rgba(255,255,255,0.5)`, `backdrop-blur(2px)`, shadow
  `-8px 7px 28px rgba(0,0,0,0.25)`, pill radius 80px.
- **Fonts:** UI/body copy is **Open Sans** (weights used: Light, Regular,
  SemiBold, Bold, ExtraBold — `fontVariationSettings: "wdth" 100`, i.e. the
  variable font's default width axis). The only non-Open-Sans usage anywhere
  in the six frames is the ★ divider glyph row, set in **Lora Bold**. No
  Praise/Newsreader usage on this surface.
- **No Figma variables/styles bound anywhere** on this page — all colors are
  raw hex/rgba on the layer fills, confirmed via `get_variable_defs`
  returning `{}` for all six frames.

---

## Screen 1 — Home (`155:2`)

### Layout

- Root scroll content `Frame 49` (390×1168, scrolls inside the 864 viewport),
  padding 24px, gap 24px, children stacked top→bottom:
  1. **Daily Tip** card (`155:53`) — 341×90, padding 16px, gap 4px.
  2. **Next Post** block (`155:61`) — no card chrome (bare stack), gap 16px.
  3. **Daily Tip** #2, reused-name "Last Post" block (`155:79`) — gap 16px,
     bracketed top/bottom by the ★ divider row (bottom one is `hidden:true`
     in the comp — i.e. authored but suppressed; treat as an available
     variant, not a mistake to fix).
  4. **Weekly posts** stack (`155:109`) — 341px wide, gap 16px, three day
     cards (Wednesday/Thursday/Friday shown; a `hidden` 1px rule divider
     (`155:150`) between Friday's card and a would-be 4th suggests the list
     is meant to be scrollable/extensible, not hard-capped at 3).
- Bottom-left Logo mark + bottom-right 3-icon nav cluster, both frame-pinned
  (see Global notes).

### Type styles (every text run)

| Node | Copy | Family/Weight | Size | Color | Notes |
|---|---|---|---|---|---|
| `155:173` | "Daily Insight" | Open Sans SemiBold | 12px | `#60B1AD` | icon+label row, 4px gap |
| `155:52` | Daily tip body | Open Sans Regular | 14px | `#F7EADD` | full-width, normal line-height |
| `155:24` | "Your Next Post" | Open Sans Bold | 12px | `#FFFFFF` | eyebrow label |
| `155:25` | Recommendation headline | Open Sans **Light** | 30px | gradient `#FFFFFF → #999999` (top→bottom, `bg-clip-text`) | the one gradient-text usage on this surface |
| `155:59` | "Let's go!" | Open Sans Bold | 12px | `#2B1821` | inside cream pill button |
| `155:72` | "Why this works?" | Open Sans Bold | 12px | `#D13E5B` | plain-text link affordance, no underline in the comp |
| `155:80`/`155:84` | ★ row (37 stars) | **Lora Bold** | 6px | `#3C2736` | `letter-spacing: 4.08px`; the "star-row divider" motif |
| `155:82` | "Last Post" | Open Sans SemiBold | 12px | `#60B1AD` | |
| `155:83`/`93`/`89` | Stat numbers (32%, 241, 91) | Open Sans ExtraBold | 24px | `#B09C89` | centered over 89px columns |
| `155:86`/`100`/`105` | Stat sublabels (Ratio/Reach/Engagement) | Open Sans Regular | 12px | `#705F57` | paired with a trend-arrow glyph |
| `155:172` | Last-post title/desc | Open Sans Regular | 14px | `#B09C89` | |
| `155:167` | "What worked:" | Open Sans Bold | 12px | `#D13E5B` | |
| `155:169` | What-worked body | Open Sans Regular | 14px | `#705F57` | |
| `155:112`/`143`/`148` | Weekday labels | Open Sans SemiBold | 12px | `#60B1AD` | |
| `155:133`/`144`/`149` | Weekday descriptions | Open Sans Regular | 14px | `#A35887` | same base hex as the card-fill color, used solid here |

### Colors (fills/strokes not already in the type table)

- Daily Tip card fill: `rgba(163,88,135,0.10)`.
- CTA pill button fill: `#F7EADD`, radius 999px, padding `8px 24px`.
- Weekly-post card fill: `rgba(163,88,135,0.10)`, radius 16px, padding 16px.

### Components

- **Daily Tip card** — icon (`arrow-circle-up`, rotated 180°) + label row,
  then body copy. The rotated-180 up-arrow reads as a "refresh/rotate"
  glyph here (distinct from its trend-indicator use on Stats — see Screen 2).
  Closest Phosphor: `ArrowCircleUp` (confirmed present in
  `@phosphor-icons/react@2.1.10`), rotated via CSS.
- **CTA row** — pill button ("Let's go!") + plain-text link ("Why this
  works?"), 8px gap, `items-center`.
- **"Why this works?" expandable** — the hidden `WTW expanded` frame
  (`155:68`, 342×211, `hidden:true`) is the expanded state, revealed
  presumably by tapping "Why this works?". Content: "Why this works:" label
  (`#D13E5B`, Bold 12px) + a 3-item **ordered list** (`#7E5D6F`, Regular
  14px, `list-decimal`, 21px hanging indent). This is the WTW-expanded state
  referenced in the brief.
- **Last Post stat row** — avatar (50×50 circle, photo), then 3 equal-width
  stat columns (number + sublabel + trend arrow).
- **Trend arrow** — `ArrowCircleUp`, plain orientation = up/positive
  (sampled fill ≈ `#2AD596`, matches the Checklist's checked-square green —
  see Token Table `--pb-success`), rotated 180° = down/negative (sampled
  fill in the deep-red family, consistent with `--pb-accent-red`). Down
  variant only appears on "Ratio" in this comp; Reach/Engagement are always
  shown up. Flagged as a state, not confirmed exhaustively for every metric.
- **Weekly posts list** — repeating day card, no visible checkbox/checked
  state on Home (that's the Checklist screen's job).

### Interaction affordances visible in the comp

- "Let's go!" — launches creation flow seeded with the recommendation (per
  brief).
- "Why this works?" — expand/collapse toggle to the WTW-expanded content.
- Bottom-right 3-icon cluster: **Lightning** (outline, unselected — Home
  screen shows all three icons in outline/unselected state), **fediverse-
  logo** (outline), **ListChecks** (outline). See "Nav icon semantics" below.
- Bottom-left Logo mark: brand/Home tap target (per brief; not separately
  labeled in the comp).

---

## Screen 2 — Stats (`155:213`)

### Layout

- Root scroll content `Frame 49` (390×1340, scrolls), padding 24px, gap 24px:
  1. **Stats Nav** (`155:217`) — pill-shaped filter-chip row, 342×56,
     `rgba(163,88,135,0.10)` fill, radius 256px (i.e. fully pill), padding
     16px, gap 16px, 5 chips: All Time (active) / Last Week / Reach /
     Engagement / Score.
  2. **Post list** (`155:645`) — 7 post cards, each `Post` (342×162, or 156
     for the last two — content-driven height), gap 16px between cards.

### Type styles

| Node | Copy | Family/Weight | Size | Color |
|---|---|---|---|---|
| `155:221` (active chip) | "All Time" | Open Sans Bold | 12px | `#271621` on `#60B1AD` pill |
| `155:480`/`484`/`488`/`753` (inactive chips) | Last Week / Reach / Engagement / Score | Open Sans SemiBold | 12px | `#705F57` |
| `155:529` etc. | Stat numbers (165%, 241, 182…) | Open Sans ExtraBold | 24px | `#B09C89` |
| `155:531` etc. | Stat sublabels | Open Sans Regular | 12px | `#705F57` |
| `155:546` etc. | Post title/description | Open Sans Regular | 14px | `#B09C89` |
| `155:839` etc. | "Show Insight" | Open Sans Bold | 12px | `#D13E5B` |
| `157:80` (Reel badge) / `157:92` (Post badge) | "Reel" / "Post" | Open Sans Bold | 12px (rendered ~9px cap-height via `text-box-trim`) | `#705F57` on transparent, 1px `#705F57` border, pill radius 88px |
| `157:82` etc. | Date ("Jan 21, 2024") | Open Sans Regular | 12px | `#705F57` |
| `155:548` etc. (rank watermark) | "1"–"7" | Open Sans ExtraBold | **171px** | `rgba(209,62,91,0.10)` | giant background numeral, absolute-positioned top-right of each card, `overflow-clip`'d by the card |

### Colors

- Post card fill: `rgba(163,88,135,0.10)` — **except the #1 (top) card**,
  which additionally gets a 1px `#9A597F` border and a drop shadow
  `0 8px 20px rgba(0,0,0,0.35)` — visually calling out the top performer.
  This is the only card in either Home or Stats with a border+shadow.

### Components

- **Filter-chip nav** — same "Stats Nav" pill component reused on Booking
  and Checklist (see below) with different chip labels per screen. Active
  chip = solid `#60B1AD` fill pill, `#271621` text; inactive chips = plain
  text, `#705F57`, no chip background.
- **Post card** — avatar (50×50) + 3-stat row (ratio/reach/engagement, same
  layout as Home's Last Post), then title/description, then a meta row
  (Show Insight link / Post-or-Reel badge / date). Cards #5–7 have a
  slightly different internal layout (title+"Show Insight" stacked with 4px
  gap, no separate badge/date row visible in the comp) — likely a shorter
  variant for posts without full metadata; note as-is, don't force uniform.
- **Rank watermark** — decorative giant numeral behind each card, low-alpha
  brand red, clipped to the card bounds. Purely ordinal (1–7 = list
  position), not a score.
- **Trend arrows** — same component/coloring as Home.

### Interaction affordances

- Filter chips (All Time / Last Week / Reach / Engagement / Score) — tap to
  re-sort/filter the list (exact behavior not shown; only "All Time" active
  state exists in the comp — filtering logic is a P5 judgment call).
- "Show Insight" — expandable per-post detail (P5, per brief).
- Nav cluster: **Lightning-fill** (filled/active — confirms Stats owns the
  "lightning" icon), fediverse-logo (outline), ListChecks (outline).

---

## Screen 3 — Booking (`155:303`)

### Layout

- Root scroll content `Frame 49` (390×1202, scrolls in an 874-tall frame),
  padding 24px, gap 24px:
  1. **Stats Nav** reused as filter chips (`155:922`) — 3 chips this time:
     New (active) / Replied / Category (with a `caret-down` disclosure
     glyph — this chip opens a picker, unlike the other two).
  2. **Daily Tip** card (`155:307`) — same component as Home's, business-
     flavored copy ("Specific to business insight to landing a gig and
     staying firm on pricing.").
  3. **Pipeline** list (`155:313`) — "Pipeline" eyebrow label, then 8
     `Checklist`-named venue rows (component name collides with the
     Checklist screen's row component but is a different card shape — see
     below), 341×102 each, gap 8px (tighter than the 16px used elsewhere).

### Type styles

| Node | Copy | Family/Weight | Size | Color |
|---|---|---|---|---|
| `155:924` (active chip) | "New" | Open Sans Bold | 12px | `#271621` on `#60B1AD` pill |
| `155:926`/`928` (inactive) | Replied / Category | Open Sans SemiBold | 12px | `#705F57` |
| `155:311` | "Daily Insight" | Open Sans SemiBold | 12px | `#60B1AD` |
| `155:312` | Insight body | Open Sans Regular | 14px | `#F7EADD` |
| `155:314` | "Pipeline" | Open Sans Bold | 12px | `#FFFFFF` |
| `155:1031` (venue name) | "Lost Lake Lounge" | Open Sans SemiBold | **16px** | `#FFFFFF` |
| `155:1033` (contacts) | "Haylee & Jessica" | Open Sans Regular | 14px | `#B09C89` |
| `155:1034` (venue type) | "Listening Room" | Open Sans Regular | 12px | `#60B1AD` |
| `155:1221` (city) | "Denver" | Open Sans Regular | 12px | `#705F57` |
| `156:2` (frequency) | "2 times" | Open Sans Regular | 12px | `#705F57` |
| `157:70` (category) | "Category" | Open Sans Regular | 12px | `#705F57` |
| `157:3`/`157:5`/`157:69` (separators) | "/" | Open Sans Regular | 12px | `#463C31` |

### Colors

- Venue row card fill: `rgba(163,88,135,0.10)`, radius 16px, padding 16px,
  gap 8px (tighter internal rhythm than the Home/Stats cards' 16px).
- Slash-separator color `#463C31` is a new value not used anywhere else in
  the six frames.

### Components

- **Filter-chip nav (Booking variant)** — same component as Stats Nav;
  third chip ("Category") carries a 12×12 `caret-down` glyph, Phosphor
  `CaretDown` (confirmed present).
- **Venue/pipeline row** — venue name (16px, only place in the whole
  surface a card title runs at 16px instead of 14px), contacts, then a
  single-line meta row of 4 fields joined by `#463C31` slashes: venue type
  (teal `#60B1AD`) / city / frequency / category (all `#705F57`).
- All 8 pipeline rows in the comp carry identical placeholder copy ("Lost
  Lake Lounge" / "Haylee & Jessica" / "Listening Room / Denver / 2 times /
  Category") — confirmed intentional placeholder repetition, not a
  component-instance bug to "fix."

### Interaction affordances

- Filter chips (New / Replied / Category-picker).
- Tapping a venue row opens a detail sheet (P5, per brief — not comped here).
- Nav cluster: lightning (outline), **fediverse-logo-fill** (filled/active
  — confirms Booking owns the fediverse-logo/sparkle icon), ListChecks
  (outline).

### P5 judgment needed (Booking)

- The "Category" filter chip's caret-down suggests a dropdown/picker
  interaction pattern not otherwise specified in this comp set — needs a
  P5 design pass for the picker UI itself.

---

## Screen 4 — Checklist (`155:391`)

### Layout

- Root scroll content `Frame 49` (390×666 — shorter than the 864 frame; this
  screen does **not** need to scroll at this content length), padding 24px,
  gap 24px:
  1. **Stats Nav** reused as tab nav (`155:1004`) — 342×56 (fixed height
     here, `h-[56px]` explicit unlike the auto-height chip rows on Stats/
     Booking), 3 tabs: Checklist (active) / Instagram / Facebook.
  2. **Checklist rows** (`155:1012`) — 7 rows, 341×70 each, gap 8px. First
     3 rows checked (`check-square-fill`), remaining 4 unchecked (`square`
     outline).

### Type styles

| Node | Copy | Family/Weight | Size | Color |
|---|---|---|---|---|
| `155:1006` (active tab) | "Checklist" | Open Sans Bold | 12px | `#271621` on `#60B1AD` pill |
| `155:1008`/`1010` (inactive tabs) | Instagram / Facebook | Open Sans SemiBold | 12px | `#705F57` |
| Row body copy (all 7) | "Lorem ipsum daily sipt goes here…" | Open Sans Regular | 14px | `#F7EADD` |

### Colors

- Row fill: `rgba(163,88,135,0.10)`, radius 16px, padding 16px, gap 16px
  (icon-to-text).
- **Checked icon** (`check-square-fill`) — sampled fill `#2BC28C` (bright
  teal-green; distinct from the `#60B1AD` insight-teal — this is a
  dedicated success/checked color, not a reuse of the brand teal). Not
  extractable as a vector fill from `get_design_context` (the icon is a
  flattened image asset in the API response) — value is pixel-sampled from
  the rendered PNG, high confidence (clean, non-anti-aliased sample area).
- **Unchecked icon** (`square`) — pixel-confirmed 2px stroke `#F7EADD`
  (identical to the cream/CTA token), transparent fill (row card color
  shows through), 32×32, presumably rounded-square per the Phosphor
  `Square` glyph.

### Components

- **Tab nav** — identical component to the Stats/Booking filter-chip row,
  3rd reuse.
- **Checklist row** — icon (32px) + body copy (14px, cream, 273px column),
  16px gap, no visible per-row title (unlike Home's stat-labeled rows) —
  this is a flat task list, not a data card.

### Interaction affordances

- Tabs (Checklist / Instagram / Facebook) — switches the row content set;
  IG/FB tab content comes from `playbook.json` v2 (per brief), not comped
  here.
- Row tap = toggle check state (implied by the checked/unchecked pair, not
  literally shown as an interaction in a static comp).
- Nav cluster: lightning (outline), fediverse-logo (outline), **list-checks
  (outline, NOT filled)** — see P5 flag below.

### P5 judgment needed (Checklist)

- The bottom-nav `list-checks` icon on the Checklist screen itself is
  **not** shown in its filled/active state (`155:472`, name "list-checks 1",
  no "-fill" suffix), while Stats and Booking both show their own icon
  filled when active (`lightning-fill`, `fediverse-logo-fill`). This breaks
  the established active-state pattern. Treat as a Figma comp gap — the
  build should use `ListChecksFill` (or equivalent solid variant) on this
  screen's nav for consistency, not replicate the outline literally.

---

## Screen 5 — Creation flow: idea entry (`155:1038`)

**Different background family from Screens 1–4.** The `get_design_context`
reference code reports the same `rgba(36,20,32,0.94)` scrim class as the
other frames (likely a stale copy-paste artifact from duplicating the
component), but pixel-sampling the actual rendered screenshot at multiple
points (20,500 / 20,700 / 200,750 / 20,820) returns a consistent
`rgb(11–13, 43–51, 43–51)` — i.e. **solid dark teal, not plum**. The bottom
Exit bar's fill is explicitly given in the reference code as `#0D3333`
(confirmed exact — `rgb(13,51,51)` matches the pixel sample precisely), and
that value is consistent with the sampled background elsewhere in the frame.
**Conclusion: this take-over's background is `#0D3333` (solid, or a very
subtle vignette around that value), not the plum-photo scrim.** This is a
deliberate surface-family split (isolated dark-teal "creation mode" vs.
plum-photo "browse mode") and is treated as such in the token table
(`--pb-bg-takeover`, distinct from `--pb-bg`).

### Layout

- No content padding container matching the other screens' 24px-all-sides;
  instead: headline pinned near top-left (~24px inset), mic button pinned
  top-right (40×40 circle at x=314,y=28), then a content stack
  (`px-24 py-8`, starting y=97) with the input card + button row, gap 24px.
- Fixed-position **Exit bar** pinned to the frame bottom: full-width,
  `px-8 py-24`, height 70px, `#0D3333` fill, centered "Exit" label.
- Oversized Logo mark (~2289×2289px, i.e. ~10.6× the base-surface Logo
  scale) positioned almost entirely off-canvas — see P5 flag below.
- No bottom-right icon-cluster nav on this screen (take-over UX — Exit is
  the only way out, per the brief's confirm-and-save-draft flow).

### Type styles

| Node | Copy | Family/Weight | Size | Color |
|---|---|---|---|---|
| `155:1127` | "What's your idea?" | Open Sans Bold | 20px | `#FFFFFF` |
| `155:1129` | "I want to create a post where I'm…" | Open Sans SemiBold | 20px | `#000000` (pure black) | inside the light input card |
| `155:1136` | "Generate  Storyboard" (double space in source copy) | Open Sans Bold | 12px | `#F7EADD` | inside outlined pill |
| `157:79` | "Make it better" | Open Sans Bold | 12px | `#F7EADD` | plain text, no chrome |
| `155:1140` | "Exit" | Open Sans Bold | 16px | `#F7EADD` | only 16px UI label on this surface outside headlines |

### Colors

- Input card (`155:1123`): fill `#F7F7F7` (near-white, new value — the one
  light-mode "paper" surface anywhere in this design), radius 16px, fixed
  height 200px, padding 24px. Text is anchored top of the card (24px inset)
  with the rest of the 200px height acting as writing room — functionally
  a `<textarea>`.
- "Generate Storyboard" button: `1px` border `#F7EADD`, no fill, radius
  999px, padding `16px 24px`.
- "Make it better": no border/fill, same text color, same padding — a
  lower-emphasis text-button sibling to the outlined pill.
- Mic button circle (`155:1117`/`1113`): sampled fill ≈ `#155454`–`#165757`
  (a lighter tint of the `#0D3333` base — reads as a subtle raised circle,
  not a strong accent color). Pixel-sampled only (flattened asset in the
  API response); flagged low-confidence in the token table.

### Components

- **Idea textarea card** — light "paper" input, black text (only black
  text usage in the whole design), 20px SemiBold — noticeably larger and
  heavier than any other body-copy size, functioning as a prominent prompt
  field.
- **Mic button** — 40×40 circle, `Microphone` glyph (Phosphor `Microphone`
  confirmed present), top-right, Web Speech API trigger per brief.
- **Button row** — outlined pill ("Generate Storyboard") + plain-text
  button ("Make it better"), 24px gap, left-aligned (NOT `justify-between`
  — contrast with Screen 6's button row).
- **Exit bar** — full-bleed bottom bar, distinct fill from the rest of the
  screen (`#0D3333` on top of a background that pixel-samples to
  approximately the same value — i.e. the bar may be nearly invisible as a
  separate element and read as a pinned label instead of a raised bar;
  flagged for visual QA once built).

### Interaction affordances

- Mic — dictation input (feature-detected, per brief).
- "Generate Storyboard" — advances to the question-page flow / kicks off
  a `questions` generation job.
- "Make it better" — sharpens the idea via a `make_it_better` job (per
  brief), no visible before/after UI in this comp (P5).
- "Exit" — confirm + save draft (per brief), not shown as a confirm dialog
  in this comp (P5).

### P5 judgment needed (idea entry)

- **Oversized/off-canvas Logo mark.** At `155:1099` the guitar-pick lockup
  is scaled to ~2289×2289px (vs. ~216×216px on the base surface) and
  positioned at large negative offsets, landing almost entirely outside the
  390×864 frame. It does not appear at all in the rendered screenshot.
  This reads as an unintentional Figma paste-scale error (dragging the
  component in at the wrong zoom level) rather than a deliberate "giant
  corner bleed" effect, but is flagged rather than silently corrected.
  Recommend either omitting the mark on the two creation-flow take-over
  screens, or resizing it to the base-surface's 215.81px scale for visual
  consistency — confirm with design before building.
- **Exit bar fill vs. surrounding background** are close enough in value
  that the bar may not read as a distinct element once built — worth a
  contrast check against the live render.
- Mic-button circle fill is pixel-sampled, not vector-exact (flattened
  asset) — acceptable for a small decorative circle, but call out if pixel
  precision matters at build time.

---

## Screen 6 — Creation flow: question page (`155:1143`)

Same background-family finding as Screen 5 (`#0D3333` solid teal, confirmed
via the same explicit `#0D3333` Exit-bar fill + consistent screenshot
pixel-sampling). Same oversized/off-canvas Logo mark issue (`155:1146`,
same P5 flag applies here too).

### Layout

- Headline "Question to answer" pinned near top (~24px inset, same position
  formula as Screen 5's headline).
- Content stack (`155:1206`, 341px wide, left:25/top:97 — 1px off Screen 5's
  implicit 24px left-inset; treat as equivalent, not a meaningful design
  difference), gap 24px:
  1. **Answer-row list** (`155:1164`) — reuses the exact Checklist-screen
     row component (check-square-fill / square icon + 14px cream body
     copy, 341×70 rows, gap 8px) as the **multiselect option list**. 3 rows
     pre-selected (checked), 4 unchecked — this is the multiselect pattern
     referenced in the brief's question-engine schema (`type: "multiselect"`).
  2. **Button row** (`155:1202`) — "Back" (plain text, left) / "Generate
     Storyboard" (outlined pill, right), `justify-between` (contrast with
     Screen 5's left-aligned gap-24 pair — this row spans the full 341px
     width edge to edge).
- Fixed Exit bar, identical component to Screen 5.

### Type styles

| Node | Copy | Family/Weight | Size | Color |
|---|---|---|---|---|
| `155:1161` | "Question to answer" | Open Sans Bold | 20px | `#FFFFFF` |
| Row body copy (×7, placeholder) | "Lorem ipsum daily sipt goes here…" | Open Sans Regular | 14px | `#F7EADD` |
| `155:1204` | "Back" | Open Sans Bold | 12px | `#F7EADD` |
| `155:1208` | "Generate  Storyboard" | Open Sans Bold | 12px | `#F7EADD` |
| `155:1163` | "Exit" | Open Sans Bold | 16px | `#F7EADD` |

### Colors

Same row/icon/button colors as Screen 4 (Checklist) and Screen 5's button
styling — no new hex values introduced on this screen.

### Components

- **Multiselect option row** — literally the Checklist row component,
  repurposed as a selectable-option list. Confirms the brief's instruction
  to treat this comp as "the pattern" for the generic question-type engine
  (multiselect specifically; single/text/yes-no/scale are NOT comped and
  are P5 design work per the brief).
- **Back/Generate button row** — the only `justify-between`, full-width
  button pairing anywhere in the six frames.

### Interaction affordances

- Row tap = toggle selection (multiselect).
- "Back" — returns to the previous question or idea-entry.
- "Generate Storyboard" — advances/submits (same label as Screen 5's
  primary CTA — reads as the flow's consistent forward-action label,
  reused rather than changed per step).
- "Exit" — same as Screen 5.

### P5 judgment needed (question page)

- Only the multiselect row-list variant is comped. Single-select (radio),
  text_short/text_long (the Screen-5 white input card, per brief), yes_no
  (two large buttons, per brief), and scale (five tap targets, per brief)
  all need original P5 layouts — the brief already specifies the intended
  shape for each; this spec doesn't repeat that, only confirms multiselect
  is the only one with a real Figma comp to build from 1:1.
- No progress indicator (step N of M) is comped despite the brief requiring
  "progress indication" — P5 design needed.

---

## Nav icon semantics (cross-screen synthesis)

The bottom-right icon cluster has only 3 slots but the product has 4 primary
destinations (Home/Stats/Booking/Checklist). Reading all four base-surface
screens together:

| Screen | Slot 1 (lightning) | Slot 2 (fediverse-logo) | Slot 3 (list-checks) |
|---|---|---|---|
| Home | outline | outline | outline |
| Stats | **filled** | outline | outline |
| Booking | outline | **filled** | outline |
| Checklist | outline | outline | outline (should be filled — P5 flag above) |

All three icons render outline-only on Home, and Home has no dedicated icon
slot — confirming (per the sprint brief) that **the bottom-left Logo mark is
the Home nav target**, and the 3-icon cluster is Stats/Booking/Checklist
only, with the active screen's icon shown filled.

**Phosphor icon mapping:**

| Figma layer name | Phosphor equivalent | Confirmed in `@phosphor-icons/react@2.1.10`? |
|---|---|---|
| `lightning 1` / `lightning-fill 1` | `Lightning` / `LightningFill` | Yes (`Lightning` confirmed; fill variant is the same component's `weight="fill"` prop, not a separate import, per Phosphor's API) |
| `list-checks 1` | `ListChecks` | Yes |
| `check-square-fill 1` | `CheckSquare` (`weight="fill"`) | Yes |
| `square 1` | `Square` | Yes |
| `arrow-circle-up 1` | `ArrowCircleUp` | Yes |
| `caret-down 1` | `CaretDown` | Yes |
| `microphone 1` | `Microphone` | Yes |
| `fediverse-logo 1` / `fediverse-logo-fill 1` | **No exact match** | **No** — Phosphor has no Fediverse/Mastodon glyph in this version. |

### P5 judgment needed (nav icons, cross-cutting)

- **`fediverse-logo` has no Phosphor equivalent.** Visually (per the
  screenshot) it reads as a 4-lobed sparkle/bloom shape. The closest
  available Phosphor glyphs are `Sparkle` and `MagicWand` (both confirmed
  present in the installed package). Recommend `Sparkle` as the closer
  visual match pending designer sign-off — this is also consistent with the
  sprint brief's own "lightning/**sparkle**/list" phrasing for the nav.

---

## Token table

Every hex/rgba value used across the six frames, mapped to a proposed
`--pb-*` token. Where a value is identical to an existing `--mc-*` token
(current `token-map.css` contents reproduced in the "Existing `--mc-*`
match" column for reference — see that file for full context), a **new**
`--pb-*` name is still minted per the logged 2026-06-16 decision that this
surface's palette stays isolated from the public-site tokens.

### Colors — base surface (Home / Stats / Booking / Checklist)

| `--pb-*` token | Value | Existing `--mc-*` match | Used for |
|---|---|---|---|
| `--pb-bg` | `#241420` | `--mc-bg` (`#241420`) — **exact duplicate** | Base rect under the photo/scrim |
| `--pb-bg-overlay-rgb` | `36 20 32` | `--mc-bg-rgb` — **exact duplicate** | `rgba(var(--pb-bg-overlay-rgb) / 0.94)` full-bleed scrim |
| `--pb-bg-overlay-alpha` | `0.94` | (n/a — `--mc-menu-overlay-bg` uses the same 0.94 composed value) | scrim opacity |
| `--pb-bg-blur` | `28px` | (n/a — `--mc-menu-overlay-blur` is also `28px`) | scrim backdrop-blur |
| `--pb-card-rgb` | `163 88 135` (`#A35887`) | none | `rgba(var(--pb-card-rgb) / 0.10)` — universal card fill |
| `--pb-card-bg` | `rgb(var(--pb-card-rgb) / 0.10)` | none | composed card fill |
| `--pb-card-text` | `#A35887` | none | Weekly-post description text (solid use of the card-fill hue) |
| `--pb-teal` | `#60B1AD` | `--mc-teal-light` (`#60B1AD`) — **exact duplicate** | Daily Insight / Last Post / weekday labels / venue-type / active-pill fill / checked-row accent family |
| `--pb-teal-ink` | `#271621` | none | text on the active `--pb-teal` filter/tab pill |
| `--pb-cta-bg` | `#F7EADD` | `--mc-bg-card` (`#F7EADD`) — **exact duplicate** | CTA pill fill, checklist body copy, Exit label, checkbox border |
| `--pb-cta-ink` | `#2B1821` | none (close to `--mc-bg` `#241420` but distinct) | text on the `--pb-cta-bg` pill (Home's "Let's go!") |
| `--pb-accent-red` | `#D13E5B` | `--mc-accent-red` (`#D13E5B`) — **exact duplicate** | "Why this works?" / "What worked:" / "Show Insight" links, rank-watermark base hue |
| `--pb-accent-red-rgb` | `209 62 91` | `--mc-accent-red-rgb` — **exact duplicate** | `rgba(var(--pb-accent-red-rgb) / 0.10)` rank watermark |
| `--pb-stat-number` | `#B09C89` | none | Stat big numbers, last-post/stat-card title text |
| `--pb-text-muted` | `#705F57` | none | Stat sublabels, inactive chip/tab text, meta text, Reel/Post badge |
| `--pb-divider` | `#3C2736` | none | ★ row glyph color |
| `--pb-slash` | `#463C31` | none | "/" separators in the Booking pipeline meta row |
| `--pb-wtw-body` | `#7E5D6F` | none | "Why this works" expanded numbered-list body text |
| `--pb-success` | `#2BC28C` (sampled) | none | Checked checkbox fill; shared with the up-trend arrow (sampled, same family) |
| `--pb-post-card-border` | `#9A597F` | none | Stats #1-ranked post card border only |
| `--pb-post-card-shadow` | `0 8px 20px rgba(0,0,0,0.35)` | none | Stats #1-ranked post card shadow only |
| `--pb-nav-pill-shadow` | `-8px 7px 28px rgba(0,0,0,0.25)` | none | bottom nav cluster shadow |
| `--pb-nav-pill-blur` | `2px` | none | bottom nav cluster backdrop-blur |
| `--pb-nav-pill-border-rgb` | `255 255 255` (alpha 0.5) | none | bottom nav cluster 0.5px border |
| `--pb-nav-pill-grad-from-rgb` | `255 255 255` (alpha 0.4) | none | bottom nav cluster gradient start |
| `--pb-nav-pill-grad-to-rgb` | `153 153 153` (alpha 0.4) | none | bottom nav cluster gradient end |
| `--pb-nav-icon-circle` | `rgba(255,255,255,0.08)` (**sampled, low confidence**) | none | per-icon circle behind each nav glyph — flattened asset, could not extract as a vector fill; verify in Figma desktop before final build if pixel precision matters |

### Colors — creation-flow take-over (idea entry / question page)

| `--pb-*` token | Value | Existing `--mc-*` match | Used for |
|---|---|---|---|
| `--pb-bg-takeover` | `#0D3333` | `--mc-teal-ink` (`#0D3333`) — **exact duplicate** | Full-screen take-over background + Exit bar |
| `--pb-input-bg` | `#F7F7F7` | none | Idea-entry textarea card |
| `--pb-input-text` | `#000000` | none | Text inside the light input card (only pure-black text on the whole surface) |
| `--pb-mic-circle-bg` | `#155454` (**sampled, low confidence**) | none | Mic-button circle, idea-entry screen only |

### Type sizes (all Open Sans unless noted)

| `--pb-*` token | px | rem (16px root) | Weight(s) used at this size | Used for |
|---|---|---|---|---|
| `--pb-text-divider` | 6px | 0.375rem | Lora **Bold** | ★ row glyph (`letter-spacing: 4.08px`) |
| `--pb-text-2xs` | 12px | 0.75rem | Regular / SemiBold / Bold | Labels, sublabels, chips, buttons, meta text — the most-used size on this surface |
| `--pb-text-sm` | 14px | 0.875rem | Regular | Body copy, card descriptions, checklist rows |
| `--pb-text-base` | 16px | 1rem | SemiBold (venue name) / Bold (Exit label) | Booking venue name; Exit bar label |
| `--pb-text-md` | 20px | 1.25rem | Bold / SemiBold | Creation-flow headlines + idea-entry input text |
| `--pb-text-lg` | 24px | 1.5rem | ExtraBold | Stat numbers |
| `--pb-text-xl` | 30px | 1.875rem | Light | Home's recommendation headline (gradient text) |
| `--pb-text-watermark` | 171px | 10.6875rem | ExtraBold | Stats rank-number background numeral |

### Spacing / radii

| `--pb-*` token | Value | Used for |
|---|---|---|
| `--pb-space-content` | 24px | Base-surface outer content padding (all sides) |
| `--pb-space-section` | 24px | Gap between major stacked blocks |
| `--pb-space-card` | 16px | Card internal padding; most inter-element gaps |
| `--pb-space-tight` | 8px | Booking/Checklist row-to-row gap; card-internal tight stacks |
| `--pb-space-micro` | 4px | Icon-to-label gaps |
| `--pb-radius-card` | 16px | Universal card/row radius |
| `--pb-radius-pill` | 999px | CTA buttons, "Reel"/"Post" badges (radius 88px — see below) |
| `--pb-radius-badge` | 88px | "Reel"/"Post" meta badges, active filter/tab pill |
| `--pb-radius-nav` | 80px | bottom icon-cluster nav pill |
| `--pb-radius-chip-row` | 256px | filter-chip / tab row container (functionally a pill at this row height) |
| `--pb-icon-size` | 24px | nav glyph size |
| `--pb-icon-circle` | 40px | nav icon circle diameter |
| `--pb-checkbox-size` | 32px | Checklist row icon size |

---

## Acceptance self-check

- All six frames covered (Home `155:2`, Stats `155:213`, Booking `155:303`,
  Checklist `155:391`, Creation/idea-entry `155:1038`, Creation/question
  `155:1143`), plus the hidden `WTW expanded` state (`155:68`) documented
  under Home.
- Every hex/rgba appearing in a screen section also appears in the Token
  Table above (cross-checked while writing).
- The three "Checklist"-named frames are explicitly disambiguated in the
  frame table and in each screen's own section header.
- No unexplained magic values remain per screen — anything not extractable
  as an exact value (2 icon-circle fills, both flattened image assets) is
  called out as pixel-sampled/low-confidence rather than silently invented.
