/**
 * Shared sections (ADR 2026-09-23): which of Meg's fields show on more than
 * one page, so the WordPress plugin can put an editor for them on every page
 * that shows them and save every copy back to the one page that keeps them.
 *
 * Pure. Input is the page-layout registry (each section's `source`) and the
 * plugin's field-group JSON; output is what
 * wp-plugin/megc-site-content/shared-sections.json holds. The build fails
 * here — naming the route, section and field — when the registry names a
 * field that no field group on that page carries, so a renamed field cannot
 * leave an editor box pointing at nothing (learning #126).
 */

import type { RouteLayout } from "./page-layouts";

/** The parts of an ACF/SCF field-group JSON file this reads. */
export interface AcfGroupJson {
  key: string;
  fields: { key: string; name?: string; type: string }[];
  location: { param: string; operator: string; value: string }[][];
}

/** One set of fields, kept on one page, shown on several. */
export interface SharedGroup {
  /** `<source page>-<first field name>` — stable, and a safe form-input key. */
  id: string;
  /** The WordPress page the values are stored on. */
  source: number;
  /** ACF field keys, in the order the registry names them. */
  fields: string[];
  /** The same fields' names — their meta keys on the source page. */
  names: string[];
  /** Every page whose live version shows these fields, ascending. */
  shownOn: number[];
}

/** An editor for a group on a page that is not the group's source. */
export interface SharedBox {
  /** `<host page>-<group id>`. */
  id: string;
  host: number;
  group: string;
  source: number;
  /** Section labels on the host that read this group, in page order. */
  sections: string[];
}

/** A section whose content has no field this page could hold an editor for. */
export interface SharedLink {
  host: number;
  section: string;
  /** Edit that page's own text. */
  page?: number;
  /** A wp-admin screen, relative to /wp-admin/. */
  screen?: string;
  /** What is edited there, in Meg's words. */
  what: string;
}

export interface SharedConfig {
  groups: SharedGroup[];
  boxes: SharedBox[];
  links: SharedLink[];
}

/** Top-level fields of every group located on `pageId`, by field name. */
function fieldsOnPage(groups: readonly AcfGroupJson[], pageId: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of groups) {
    const onPage = g.location.some((rules) =>
      rules.some((r) => r.param === "page" && r.operator === "==" && r.value === String(pageId)),
    );
    if (!onPage) continue;
    for (const f of g.fields) {
      if (f.name && f.type !== "tab" && f.type !== "message") out.set(f.name, f.key);
    }
  }
  return out;
}

export function buildSharedSections(layouts: readonly RouteLayout[], groups: readonly AcfGroupJson[]): SharedConfig {
  const byId = new Map<string, { source: number; names: string[]; keys: string[]; hosts: Set<number> }>();
  const boxes = new Map<string, SharedBox>();
  const links: SharedLink[] = [];

  for (const r of layouts) {
    for (const s of r.sections) {
      for (const src of s.source ?? []) {
        if (src.kind === "page" || src.kind === "screen") {
          for (const host of r.pageIds) {
            links.push(
              src.kind === "page"
                ? { host, section: s.label, page: src.pageId, what: src.what }
                : { host, section: s.label, screen: src.screen, what: src.what },
            );
          }
          continue;
        }

        const onPage = fieldsOnPage(groups, src.pageId);
        const keys = src.fields.map((name) => {
          const key = onPage.get(name);
          if (!key) {
            throw new Error(
              `shared-sections: ${r.route}/${s.id} names field "${name}", which no field group on page ${src.pageId} carries`,
            );
          }
          return key;
        });

        const id = `${src.pageId}-${src.fields[0]}`;
        const known = byId.get(id);
        if (known && known.names.join() !== src.fields.join()) {
          throw new Error(
            `shared-sections: ${id} is named with two field lists (${known.names.join(", ")} / ${src.fields.join(", ")}) — ` +
              `name the same fields everywhere it shows, or start the second list with a different field`,
          );
        }
        const entry = known ?? { source: src.pageId, names: src.fields, keys, hosts: new Set<number>() };
        byId.set(id, entry);

        for (const host of r.pageIds) {
          entry.hosts.add(host);
          if (host === src.pageId) continue; // Its own page: ACF already shows these fields there.
          const boxId = `${host}-${id}`;
          const box = boxes.get(boxId);
          if (box) {
            if (!box.sections.includes(s.label)) box.sections.push(s.label);
          } else {
            boxes.set(boxId, { id: boxId, host, group: id, source: src.pageId, sections: [s.label] });
          }
        }
      }
    }
  }

  // Shared means shown somewhere other than where it is kept, or on two pages.
  const shared = [...byId.entries()].filter(([, e]) => e.hosts.size > 1 || !e.hosts.has(e.source));
  return {
    groups: shared.map(([id, e]) => ({
      id,
      source: e.source,
      fields: e.keys,
      names: e.names,
      shownOn: [...e.hosts].sort((a, b) => a - b),
    })),
    boxes: [...boxes.values()],
    links,
  };
}
