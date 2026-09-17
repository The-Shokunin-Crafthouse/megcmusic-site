import { Fragment, type ReactNode } from "react";
import type { Block } from "@/lib/blocks";
import type { LayoutItem } from "@/lib/page-layout";
import { BlockRun } from "./BlockRun";
import { TextBlock } from "./TextBlock";

/**
 * Render a resolved page layout (Sprint 17): each section id through the
 * page's render map, text blocks as sections of their own, every other run
 * of blocks as one BlockRun. A render map entry may return null (a section
 * that has nothing to show today) — it is simply skipped, as it was before.
 */
export function PageLayout({
  items,
  render,
}: {
  items: LayoutItem[];
  render: Record<string, () => ReactNode>;
}) {
  const out: ReactNode[] = [];
  let run: Block[] = [];
  const flush = () => {
    if (run.length) {
      out.push(<BlockRun key={`run-${out.length}`} blocks={run} />);
      run = [];
    }
  };
  items.forEach((item, i) => {
    if (item.kind === "block") {
      const { block } = item;
      if (block.layout !== "text") {
        run.push(block);
        return;
      }
      flush();
      out.push(<TextBlock key={`text-${i}`} block={block} />);
      return;
    }
    flush();
    const section = render[item.id];
    if (!section) throw new Error(`page layout: no renderer for section "${item.id}"`);
    out.push(<Fragment key={item.id}>{section()}</Fragment>);
  });
  flush();
  return <>{out}</>;
}
