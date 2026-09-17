/**
 * Resolve a route's "Page layout" field (Sprint 17) into the ordered list a
 * page renders. Pure; tested directly.
 *
 * Rules (2026-09-17 ADR): an empty field is today's page — every section in
 * registry order, no blocks. Rows Meg lists render first in her order; the
 * sections she has not listed follow in registry order, so adding one block
 * never empties a page. A section row with "Hide this section" on is dropped.
 * A duplicate section row, an unknown section, or an unknown layout is
 * dropped and logged at build; a block row missing its required field is
 * dropped silently (the block parser's rule).
 */

import { parseBlock, isBlockLayout, type Block } from "@/lib/blocks";
import { sectionIds } from "@/lib/page-layouts";

export type LayoutItem = { kind: "section"; id: string } | { kind: "block"; block: Block };

const SECTION_PREFIX = "section_";

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const truthy = (v: unknown): boolean => v === true || v === 1 || v === "1";

export function resolveLayout(
  raw: unknown,
  sections: readonly string[],
  log: (message: string) => void = (m) => console.warn(m),
): LayoutItem[] {
  const out: LayoutItem[] = [];
  const seen = new Set<string>();
  const hidden = new Set<string>();

  if (Array.isArray(raw)) {
    raw.forEach((row, i) => {
      const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
      const layout = text(r.acf_fc_layout);
      if (layout.startsWith(SECTION_PREFIX)) {
        const id = layout.slice(SECTION_PREFIX.length);
        if (!sections.includes(id)) {
          log(`page layout: row ${i + 1} names unknown section "${id}" — ignored`);
          return;
        }
        if (seen.has(id)) {
          log(`page layout: row ${i + 1} lists section "${id}" again — ignored`);
          return;
        }
        seen.add(id);
        if (truthy(r.hidden)) hidden.add(id);
        else out.push({ kind: "section", id });
        return;
      }
      if (!isBlockLayout(layout)) {
        log(`page layout: row ${i + 1} has unknown layout "${layout}" — rendering nothing for it`);
        return;
      }
      const block = parseBlock(row);
      if (block) out.push({ kind: "block", block });
    });
  }

  for (const id of sections) {
    if (!seen.has(id) && !hidden.has(id)) out.push({ kind: "section", id });
  }
  return out;
}

/** A route's layout from its raw field value, logging under the route's name. */
export function layoutFor(route: string, raw: unknown): LayoutItem[] {
  return resolveLayout(raw, sectionIds(route), (m) => console.warn(`${route} ${m}`));
}
