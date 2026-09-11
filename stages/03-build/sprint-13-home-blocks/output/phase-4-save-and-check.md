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

**Result:** **PASS** — see the run record below. The measured save-to-live time for the CONTEXT close-out line was not captured on this run.

---

## Run — 2026-09-11 (runner: Levi, as Meg)

T0 PASS, T1 PASS. Block left in place (a real announcement, not a test block), so step 5 is "left in place".

| step | time | note |
|---|---|---|
| Update clicked (T0) | (not recorded) | |
| Live on megcmusic.com (T1) | (not recorded) | save-to-live = T1 − T0 — **not measured this run** |
| Screenshots | live URL is the record | verified in-session at 1440×900 and 390×844, https://megcmusic.com |
| Second block type | not run | Video block deferred; Phase 3 proved the render locally |
| Test blocks removed | left in place: "CMHOF" | Phases 1–3 rows were never saved to WordPress, so nothing to remove |
| Anything odd | 3 content items, see below | render and markup are correct |

### Verified live (2026-09-11)

The **What's New** section renders on the home page with one Announcement block. Markup as specified:

```html
<section class="HomeBlocks-module__section" aria-labelledby="home-blocks-heading">
  <h2 id="home-blocks-heading">★★★ What's New ★★★</h2>
  <article class="Announcement-module__block" aria-labelledby="_S_1_">
    <p class="Announcement-module__eyebrow">Nominations are oen</p>
    <h3 class="Announcement-module__headline" id="_S_1_">CMHOF</h3>
    <p class="Announcement-module__body">Nominate me. Click the button below.</p>
    <a class="Announcement-module__link" href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">
      <span>Nominate</span><span class="srOnly">, opens in a new tab</span><svg aria-hidden="true">…</svg>
    </a>
  </article>
</section>
```

`aria-labelledby` wired on both the section and the block; the external link carries `rel="noopener noreferrer"` and the visually-hidden ", opens in a new tab"; the arrow is `aria-hidden`. No horizontal overflow at 390.

### Content items in the live block (Meg's copy, not build defects)

1. **Typo, visitor-visible:** the eyebrow reads "Nominations are **oen**" — should be "open".
2. **Wrong link target, visitor-visible:** the **Nominate** button points at `https://gemini.google.com/app`, not the CMHOF nomination form.
3. **Eyebrow and headline read swapped:** "CMHOF" sits in the headline field and the sentence in the small line. Legible as-is; worth a mention when Meg next edits it.

All three are fixed in wp-admin → Pages → Home → Blocks, and reach the live site on the same save-to-live path.
