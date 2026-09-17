/**
 * "Work With Me" (Sprint 16 Phase 2; supersedes src/config/collaborate.ts):
 * the audience groups and the Cave Crew link from the "Work With Me" field
 * group on WP page 3742 ("Collabs"). A group needs a heading; an offering
 * needs a title; its optional detail renders after the title.
 */

import acf from "@/generated/wp-content/collabs.json";

export interface CollabOffering {
  title: string;
  detail: string;
}

export interface CollabGroup {
  heading: string;
  blurb: string;
  offerings: CollabOffering[];
}

export interface CollabContent {
  groups: CollabGroup[];
  caveCrewUrl: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

export function parseCollab(raw: unknown): CollabContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const groups = rows(r.collab_groups)
    .map((g) => ({
      heading: text(g.heading),
      blurb: text(g.blurb),
      offerings: rows(g.offerings)
        .map((o) => ({ title: text(o.title), detail: text(o.detail) }))
        .filter((o) => o.title),
    }))
    .filter((g) => g.heading);
  return { groups, caveCrewUrl: text(r.cave_crew_url) };
}

export const COLLAB: CollabContent = parseCollab(acf);
