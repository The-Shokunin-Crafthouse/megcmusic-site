/**
 * Meg's copy rule: no em dash (—) or en dash (–) anywhere in email copy.
 * Validation only — callers block or warn on a hit, never auto-rewrite.
 */

const BANNED_DASH = /[—–]/;

/** Field names (of a template PATCH payload) whose value contains a banned dash. */
export function bannedDashFields(
  fields: Record<string, string | null | undefined>,
): string[] {
  return Object.entries(fields)
    .filter(([, value]) => typeof value === "string" && BANNED_DASH.test(value))
    .map(([key]) => key);
}
