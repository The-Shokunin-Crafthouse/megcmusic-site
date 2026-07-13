# Design crit — P5 proposed screens (storyboard result, library, first-run, question layouts) — 2026-07-12

Standalone sc-design-crit pass (no Step-10 eval file). Goal weighed against: Meghan reads a finished storyboard once, picks a title, copies what she needs on a phone, and can always find her saved work. Audience: one non-technical musician. Evidence inspected: `stages/02-design/claude-design/playbook-redesign/specs.md`, implementation under `src/components/playbook/{library,creation}/`, live 390px browser session.

## Functionality

[F-01] LENS: Efficiency of the user / travel cost (Tognazzini; Fitts's inline) → Functionality
WHERE: Storyboard result, creation mode, 390px
EVIDENCE: specs.md §Screen 7 structure (titles at position 2, frames at 3, Save pinned bottom); StoryboardResult.tsx section order
FINDING: Title options render above the frames, but a title can only be judged after reading the storyboard → predicted path is scroll past titles → read 4–8 frames → scroll back up to pick → scroll back down to Save. Two full round-trips on a phone for the screen's one required decision.
SEVERITY: degraded (−1)
FIX: Reorder sections read-then-decide: frames → title options → caption → posting window → Save. Zero visual-language change; JSX order only. **Applied this pass.**

[F-02] LENS: User control and freedom (Nielsen #3) → Functionality
WHERE: Question pages — `single` and `yes_no` types, 390px
EVIDENCE: specs.md §9.11; QuestionPage auto-advance 220ms after selection
FINDING: Auto-advance commits a possibly mis-tapped answer without a confirm beat → a mis-tap costs a Back-tap plus re-orientation.
SEVERITY: polish — 70px targets make mis-taps rare, Back is one tap and preserves the answer for correction; the speed win for a 3–6 question flow outweighs it. Recorded, not scored.
FIX: none required; revisit if real usage shows Back-after-auto-advance patterns.

[F-03] LENS: Discoverability / Protect users' work (Tognazzini; Recognition over recall inline) → Functionality
WHERE: Storyboard library entry point, Home, 390px
EVIDENCE: specs.md §Screen 8 entry points; HomeScreen library row renders after the Weekly posts stack, below the fold at 390×844
FINDING: The only standing entry to her saved work is a quiet text row below the fold → a week after saving, finding a storyboard depends on recalling where the row lives, not recognizing a visible affordance.
SEVERITY: degraded (−1)
FIX (structural, deferred with reasoning): the bottom nav is comp-locked at logo + 3 circles, and the Home hero moment (Next Post) must stay uncluttered — accepted for v1 with the post-save "View in library" path as the primary teach-in; add a Home shortcut (e.g. a "Storyboards" line inside the Last Post ★ section) only if Meghan reports losing work. Logged rather than cosmetically patched.

## Design Quality

No findings. Hierarchy holds (one big-type moment per surface, eyebrow system consistent); the two surface families (plum browse / teal creation) give the flow an unambiguous figure/ground mode switch; the raised-teal frame cards keep the storyboard the visual center of its screen (Centre-Stage).

## Craft

No findings beyond sc-verify's mechanical pass. Information density on the storyboard result is chunked per frame (Chunking) with asset prompts progressively disclosed — the long technical text stays out of the read flow until asked for (Gerhardt-Powals #8).

## Originality (c)

The staged generation narrative (queued → "Warming up…" → frames staggering in as they stream) is the surface's designed peak — the product's one moment of visible magic, honestly derived from real job state (Labor Illusion, used truthfully). The post-save swap to "Saved ✓ — View in library" gives the flow a deliberate end (Peak-End). First-run's "Hey Meg." is register-true and short. No manufactured delighters; the restraint is the point on a daily-use tool.

## Trust & persuasion

All honest: no scarcity, no social proof theater, the recommendation states its data grounding ("Why this works?" cites her real numbers via the tips library). Exit confirm's primary action preserves her work ("Save draft & exit" as the filled pill) — loss-aversion respected, not exploited.

**Score impact: Functionality −2 (F-01 applied → −1 net after fix; F-03 accepted/logged). No blockers.**
