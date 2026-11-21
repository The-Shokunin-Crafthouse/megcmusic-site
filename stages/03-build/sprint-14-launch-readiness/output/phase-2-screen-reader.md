# Phase 2.4 — A real screen reader (VoiceOver)

**Sprint:** 14 · **Status: NOT RUN — Levi's.** · **Graded against:** `_config/design-system/a11y-spec.md`

The contract asks for VoiceOver, live, not a tree dump (learning #181, #226). A session cannot listen to speech output, and a structural read of the accessibility tree is the proxy this check exists to replace. So the line is **not marked verified**. It is prepared here so the run takes about 20 minutes.

## How to run it
1. Safari on the Mac, `https://megcmusic.com`. Turn VoiceOver on with Cmd-F5.
2. VO keys are Control-Option. Useful: VO-U opens the rotor (headings, links, form controls, landmarks); VO-Right/Left moves one item.
3. For each row below, move through it by the rotor and by item, and note what is spoken. Compare with the a11y spec.

| Surface | Listen for | Result (fill in) |
|---|---|---|
| Home `/` | Landmarks announced (banner, nav, main, footer); one h1; Up Next list read as a list with date, title, venue; filter pills announce name and selected state; decorative hero image skipped | |
| `/shop` | Product tiles read as name then price; sale price and was-price both spoken; "Sold out" announced; cart button announces item count; first Tab lands on a visible focus ring | |
| `/shop` cart drawer | Opening moves focus into the drawer and the drawer is announced as a dialog; quantity controls say what they change; Escape closes and returns focus to the cart button; the Checkout notice is announced (live region), not silent | |
| `/shows` | Same list pattern as home; "Add To Calendar" and search announce their purpose | |
| `/booking` | Every field has a spoken label; required fields say so; an error is announced on submit and focus goes to it; do not submit a real request, stop at the error | |

## Record
For each row: pass, or what was wrong, in the words VoiceOver used. A failure that can only be fixed by diverging a token is a stop condition in the contract (§7): name it and stop.
