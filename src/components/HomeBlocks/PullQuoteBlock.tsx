import type { HomeBlock } from "@/lib/home-blocks";

/** Phase 0 stub — the `pull_quote` block renders nothing until its own phase
 *  builds the designed component (Sprint 13 contract §§4–6). */
export function PullQuoteBlock({ block }: { block: Extract<HomeBlock, { layout: "pull_quote" }> }) {
  void block;
  return null;
}
