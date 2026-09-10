import type { HomeBlock } from "@/lib/home-blocks";

/** Phase 0 stub — the `video` block renders nothing until its own phase
 *  builds the designed component (Sprint 13 contract §§4–6). */
export function VideoBlock({ block }: { block: Extract<HomeBlock, { layout: "video" }> }) {
  void block;
  return null;
}
