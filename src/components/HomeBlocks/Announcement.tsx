import type { HomeBlock } from "@/lib/home-blocks";

/** Phase 0 stub — the `announcement` block renders nothing until its own phase
 *  builds the designed component (Sprint 13 contract §§4–6). */
export function Announcement({ block }: { block: Extract<HomeBlock, { layout: "announcement" }> }) {
  void block;
  return null;
}
