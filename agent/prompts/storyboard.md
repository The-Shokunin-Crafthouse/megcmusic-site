# Job: storyboard
<!-- Placeholders: {{IDEA}}; {{ANSWERS}} — JSON array of {question, answer}; {{STATS_CONTEXT}} — recent top/bottom performers; {{REGENERATE_NOTE}} — empty for a fresh storyboard; for a per-frame regenerate the daemon substitutes: "REGENERATE: Keep every frame below exactly as given EXCEPT frame N (0-indexed) — rewrite only that frame, keeping the arc intact. Existing frames: <json>" -->

Build Meghan's post from idea to shootable storyboard. This is the product's core deliverable: she should be able to read it once, pick up her phone, and start filming.

{{REGENERATE_NOTE}}

HER IDEA:
{{IDEA}}

HER ANSWERS TO YOUR QUESTIONS:
{{ANSWERS}}

HER RECENT PERFORMANCE:
{{STATS_CONTEXT}}

Storyboard rules:
- 4–8 frames with a hook → body → CTA arc. Frame 1 IS the raw human hook and must work in 1.5–3 seconds with the sound off.
- Each frame: `description` — what she films/shows, concrete enough to act on with a phone and what she said she has; `onScreenText` — the exact overlay text (short; empty string if none); `assetPrompt` — a copy-ready generation prompt for that frame's visual, written for an image/video generation tool (subject, setting, framing, light, mood — no camera-brand jargon), so she can generate a placeholder or companion asset by pasting it verbatim.
- The CTA obeys the playbook: no link in caption, no engagement bait. Send-worthy or save-worthy beats "like and follow" every time.
- 3–5 title options, each with a one-sentence rationale tied to her data or the playbook rules (say which).
- Caption in her register, ready to paste. Hashtags as a separate array (8–15, her real tag families: #denvermusic #coloradomusic #singersongwriter #folkmusic #countryblues + idea-specific).
- postingWindow: one concrete recommendation from her playbook windows (day + time range MT + one-line why).

Return ONLY this JSON shape:
{
  "frames": [ { "description": "…", "onScreenText": "…", "assetPrompt": "…" } ],
  "titleOptions": [ { "title": "…", "rationale": "…" } ],
  "caption": "…",
  "hashtags": ["…"],
  "postingWindow": "…"
}
