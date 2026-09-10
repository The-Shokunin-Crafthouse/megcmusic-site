# Phase 4 — Save-and-check (runner: Levi, as Meg)

The destination proof for the whole sprint: a block Meg would add in her dashboard reaches megcmusic.com, timed. Phases 1–3 proved the render and the region with rows injected into the local snapshot; nothing was ever saved to WordPress. This is the one live write, and it is Levi's.

## Steps

1. Note the time. In wp-admin → Pages → **Home** → the **Blocks** tab → *Add a block* → **Announcement**. Headline: anything real Meg would write (it is visitor-visible from the moment it lands). Optional small line, text, link text + link address. Click **Update**. Note the time again — that is T0.
2. Wait. Open https://megcmusic.com in a real browser (not curl — the checkpoint returns an empty-looking 403 to scripts). Reload every 30 s with Shift held. Note the time the **What's New** section appears with the block: that is T1. Expected: about three minutes, the Sprint 12 A.2 figure was 120 s.
3. Screenshot the section at desktop and phone width (or two screenshots from the phone and the laptop).
4. Optional, one more block type: add a **Video** with any YouTube link (a Shorts link is a good test — it was the one that broke in Sprint 12) and repeat step 2 for it.
5. Remove the test block(s): the minus on the block → **Update**. Note the time; confirm on the live site that the What's New section is gone (again about three minutes). If Meg wants to keep a real announcement up, keep it — then this step is "left in place" and say so below.

## Record

| step | time | note |
|---|---|---|
| Update clicked (T0) | | |
| Live on megcmusic.com (T1) | | save-to-live = T1 − T0 |
| Screenshots | | paths or attached |
| Second block type | | which, and its T0/T1 |
| Test blocks removed | | or "left in place: {headline}" |
| Anything odd | | |

**Result:** PASS / FAIL — and the measured save-to-live time, which goes into the CONTEXT close-out line.
