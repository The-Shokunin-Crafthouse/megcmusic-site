<!-- ============================================================ -->
<!-- BOOTSTRAP.md — GENERIC MODEL ADAPTER                         -->
<!-- ============================================================ -->
<!-- WHAT THIS FILE IS                                            -->
<!-- A model-neutral bootstrap for any AI assistant introduced    -->
<!-- to this workspace: ChatGPT, Gemini, Cursor/Windsurf agents,  -->
<!-- local models, in-house tooling. Hands off to WORKSPACE.md.   -->
<!--                                                              -->
<!-- WHAT YOU (THE MODEL) MUST DO                                 -->
<!-- Follow the load order below, in sequence, before any output. -->
<!-- Do not improvise; do not duplicate project rules into your   -->
<!-- own config; do not cross an approval gate without sign-off.  -->
<!--                                                              -->
<!-- READ NEXT                                                    -->
<!-- ../../WORKSPACE.md                                           -->
<!-- ============================================================ -->

# Generic Model Bootstrap

This workspace belongs to The Shokunin Crafthouse. Project identity, rules, and workflow are model-neutral — they live in `WORKSPACE.md` at the repo root, not here.

## Load order (non-optional)

1. `../../WORKSPACE.md` — identity, non-negotiables, operating rules, and the `Current sprint:` pointer
2. `../../WORKFLOW.md` — stage sequence and approval gates
3. The active sprint's `CONTEXT.md` — path given by the `Current sprint:` field in WORKSPACE.md; the sprint contract and Inputs table
4. Only the files named in that CONTEXT.md Inputs table — `_config/` sections selectively, never in full
5. `../../decisions/decisions.md` — prior decisions

## Operating expectations

- WORKSPACE.md is binding. Treat it as a directive, not documentation.
- **Token source is conditional.** For color, type, spacing, or motion, pull from the source named in `decisions/decisions.md`: the shared design system at `brand.shokunincrafthouse.com` for a Shokunin-branded property (local `token-map.md` is bypassed), or local `_config/design-system/token-map.md` for a client project. Never improvise a value.
- Do not cross an approval gate without explicit sign-off. See WORKFLOW.md.
- Record non-trivial decisions in `decisions/decisions.md` with date, context, rationale, consequences.
- If this workspace contradicts your general defaults, the workspace wins.
- Surface ambiguity back to the owning stage. Do not resolve it silently.

## If your host tool has its own config file

Add a pointer to `WORKSPACE.md`. Do not duplicate project rules. Duplication produces drift, and drift is how projects die.

## If you are a new kind of model not covered here

Add an adapter at `adapters/<your-tool>/` that points to `WORKSPACE.md` and follows the same shape as this file. Register the adapter in `workspace.manifest.yaml` under `adapters:`.
