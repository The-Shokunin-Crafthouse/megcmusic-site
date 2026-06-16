# Token Map

Source of truth for color, type, spacing, motion, radius, and breakpoints. Figma mirrors this file. Code generates from the token export of this file. Raw values in components or mocks are bugs.

## Color

Semantic tokens. No raw hex anywhere except here.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.bg.default` | | | Page background |
| `color.bg.surface` | | | Cards, sheets |
| `color.bg.raised` | | | Popovers, menus |
| `color.fg.default` | | | Body copy |
| `color.fg.muted` | | | Secondary copy |
| `color.fg.subtle` | | | Tertiary, captions |
| `color.border.default` | | | Dividers, inputs |
| `color.border.strong` | | | Emphasized divider |
| `color.accent.default` | | | Primary action |
| `color.accent.fg` | | | Text on accent |
| `color.danger.default` | | | Destructive, error |
| `color.danger.fg` | | | Text on danger |
| `color.success.default` | | | Confirmed, safe |
| `color.focus.ring` | | | Keyboard focus |

## Typography

One modular scale. One ratio. Declare both.

- **Ratio:** [1.125 | 1.2 | 1.25 | 1.618]
- **Base size:** 16px

| Token | Size | Line height | Tracking | Use |
| --- | --- | --- | --- | --- |
| `text.display.lg` | | | | Hero |
| `text.display.md` | | | | Section heading |
| `text.heading.lg` | | | | Page heading |
| `text.heading.md` | | | | Subsection |
| `text.heading.sm` | | | | Card title |
| `text.body.lg` | | | | Lede, intro |
| `text.body.md` | | | | Body |
| `text.body.sm` | | | | Meta, caption |
| `text.mono.md` | | | | Code, data |

**Families**
- **Display:** [Family]
- **Body:** [Family]
- **Mono:** [Family]

**Loading**
- `font-display: swap` minimum
- Self-hosted faces are subset
- Variable fonts preferred where available

## Spacing

8pt scale by default. 4pt increments only where density demands it. Arbitrary px values are a bug.

| Token | px |
| --- | --- |
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 24 |
| `space.6` | 32 |
| `space.7` | 48 |
| `space.8` | 64 |
| `space.9` | 96 |
| `space.10` | 128 |

Distinguish component-internal spacing from layout spacing. Do not reuse tokens across the two without intent.

## Radius

| Token | px | Use |
| --- | --- | --- |
| `radius.sm` | 4 | Inputs, small chips |
| `radius.md` | 8 | Cards, buttons |
| `radius.lg` | 16 | Sheets, modals |
| `radius.full` | 9999 | Pills, avatars |

## Motion

Springs for interactive affordances. Duration-based easing only on scripted timelines.

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `motion.micro` | 120ms | ease-out | Hover, press |
| `motion.standard` | 220ms | ease-out | State change |
| `motion.orchestrated` | 450ms | cubic-bezier(0.2, 0.9, 0.2, 1) | Page / route |
| `motion.spring.gentle` | — | spring(stiffness=120, damping=18) | Small affordance |
| `motion.spring.snappy` | — | spring(stiffness=300, damping=28) | Button, toggle |

Reduced-motion: provide a functional path, not a blank page. Map each motion token to its reduced-motion equivalent (usually an instant state change).

## Shadow

| Token | Definition | Use |
| --- | --- | --- |
| `shadow.sm` | | Subtle lift |
| `shadow.md` | | Popovers |
| `shadow.lg` | | Modals |

## Breakpoints

| Token | px | Use |
| --- | --- | --- |
| `bp.sm` | 390 | Small phone |
| `bp.md` | 768 | Tablet portrait |
| `bp.lg` | 1024 | Tablet landscape / small laptop |
| `bp.xl` | 1440 | Desktop |
| `bp.2xl` | 1920 | Large desktop |

## Export

Tokens export to:
- `<codebase>/tokens/*.json` (or equivalent) — consumed by the build
- Figma via Tokens Studio — consumed by designers

Both are downstream of this file. This file is the source.
