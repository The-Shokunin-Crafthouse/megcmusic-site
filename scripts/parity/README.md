# Parity harness

Two scripts that answer one question: **did this change alter what a visitor sees?**

Built for Sprint 11 (Total WordPress Editability Overhaul), whose contract was
zero change to design, layout, motion, URLs, or content while every surface
moved to reading from WordPress. They generalise to any refactor that claims to
change nothing visible.

## Running one

Both need two locally-built servers — the commit before the change and the
commit after — because production only ever serves one of them.

```bash
git worktree add /tmp/parity-before <base-commit>
git worktree add /tmp/parity-after HEAD
# Copy .env.local into each, install deps in each (a symlinked node_modules
# fails: Turbopack rejects a symlink pointing outside its filesystem root).
cd /tmp/parity-before && npm run build && npx next start -p 3101 &
cd /tmp/parity-after  && npm run build && npx next start -p 3102 &
```

Then:

```bash
node scripts/parity/parity.mjs ./out    # screenshots + text + metadata + refs
node scripts/parity/states.mjs ./states.json   # reduced motion + focus rings
```

`ROUTES`, `WIDTHS`, `BEFORE_ORIGIN` and `AFTER_ORIGIN` override the defaults.

## Establish the noise floor first

Point both origins at the **same** server and run it. Whatever difference comes
back is the harness measuring itself, not the change:

```bash
BEFORE_ORIGIN=http://127.0.0.1:3102 AFTER_ORIGIN=http://127.0.0.1:3102 \
  node scripts/parity/parity.mjs ./noise
```

On this site that floor is a few hundred pixels on pages with live data, and a
whole differing text body on `/megs-playbook`, whose panels arrive from an API
at whatever moment they arrive. A difference at or below the floor is not
evidence of anything. Skipping this step is how a live-data page gets reported
as a regression.

## Two traps these scripts already avoid

**`page.evaluate` given a string evaluates it as an expression.** Passing
`"() => document.body.innerText"` returns the *function object*, which
serialises to `undefined`. Both sides return `undefined`, `undefined ===
undefined`, and the run reports `text=true meta=true refs=true` on a page that
demonstrably changed. Every probe here is a real function, and `capture()`
throws if one comes back empty — a check that cannot fail is worse than no
check, because it is reported as a pass.

**A focus ring is not always on the focused element.** The stretched-link
pattern sets `outline: none` on the `<a>` and draws the ring on the card via
`:has(a:focus-visible)`. A probe that reads only `document.activeElement`
reports that correct pattern as an accessibility failure. `states.mjs` walks up
to four ancestors before calling a stop unstyled.

## What each script reports

`parity.mjs` — per route per breakpoint: a full-page screenshot from each side
(viewport sized to the page, so no scroll-stitching), a red-marked diff image
when they differ, plus `text` (normalised `innerText`), `meta` (title,
description, canonical, robots, OG, Twitter, JSON-LD) and `refs` (every `href`
and `img src`). Pixels alone cannot say *what* moved; text alone passes a page
that lost one section and gained an identically-worded one. Both run.

`states.mjs` — per route: whether `prefers-reduced-motion: reduce` still
delivers the page's content on each build, whether the reduced render is as
unchanged as the normal one, the focusable-element count, and a Tab walk
recording whether each stop shows a ring and where it is drawn.

A tab-order comparison that reports "changed" is worth one more check before
believing it: if the after-order is a *subsequence* of the before-order, stops
were removed and nothing was reordered.
