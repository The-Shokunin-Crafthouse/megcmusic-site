import type { HomeBlock } from "@/lib/home-blocks";
import { Announcement } from "./Announcement";
import { PullQuoteBlock } from "./PullQuoteBlock";
import { VideoBlock } from "./VideoBlock";

/** One block → one component. The parser has already dropped anything that
 *  cannot render, so every case here is a block with its required field. */
export function BlockRenderer({ block }: { block: HomeBlock }) {
  switch (block.layout) {
    case "announcement":
      return <Announcement block={block} />;
    case "pull_quote":
      return <PullQuoteBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
  }
}
