import type { HomeBlock } from "@/lib/home-blocks";
import { PullQuote } from "../PullQuote/PullQuote";

/**
 * Pull-quote block (Sprint 13 Phase 2) — the LinerNotes panel, Meg's words.
 * Any length wraps (no one-line rule); the attribution is optional and the
 * quote marks are the panel's own, so she types neither. Nothing interactive:
 * no states, no motion. Spec: _config/design-system/a11y-spec.md.
 */
export function PullQuoteBlock({ block }: { block: Extract<HomeBlock, { layout: "pull_quote" }> }) {
  return <PullQuote quote={block.quote} attribution={block.attribution || undefined} />;
}
