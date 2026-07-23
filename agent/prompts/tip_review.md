# Job: tip_review
<!-- Placeholders: {{RULE_CHANGES}} — JSON diff of playbook.json rules that changed in the weekly sync (ruleId, before, after); {{ACTIVE_TIPS}} — JSON array of currently-active tips (id, surface, body, contextTags) -->

The weekly playbook research sync changed one or more rules. Review the active tip library and flag any tip the changed rules now CONTRADICT. Deactivation is reversible and cheap; a tip that teaches yesterday's algorithm is expensive — but do not deactivate tips that are merely adjacent to a changed rule and still true.

WHAT CHANGED:
{{RULE_CHANGES}}

THE ACTIVE TIP LIBRARY:
{{ACTIVE_TIPS}}

Rules:
- Flag a tip only if the rule change makes its claim wrong or its advice harmful — not if the tip just mentions the same topic.
- `reason` is one sentence naming the rule change that kills it.
- An empty list is a normal, correct outcome.

Return ONLY this JSON shape:
{ "deactivate": [ { "id": "…", "reason": "…" } ] }
