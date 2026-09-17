/**
 * Generate the "Page layout" field groups (Sprint 17) from the registry in
 * src/lib/page-layouts.ts — one JSON per route in
 * wp-plugin/megc-site-content/acf-json/group_megc_layout_<route>.json.
 *
 *   npm run layout:build    # write the files
 *   npm run layout:check    # exit 1 if any file differs from what the
 *                           # registry would produce (unit-tests.yml)
 *
 * The registry is the source; these files are its mirror and are never
 * hand-edited (learning #178: a pasted mirror needs a generator and a check).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { PAGE_LAYOUTS, type RouteLayout } from "../../src/lib/page-layouts";

const OUT_DIR = path.join(process.cwd(), "wp-plugin", "megc-site-content", "acf-json");
const CHECK = process.argv.includes("--check");

/** The five block layouts, shared by every route. Keys are prefixed per
 *  route because ACF requires field keys to be unique across all groups. */
function blockLayouts(route: string) {
  const k = (s: string) => `field_megc_layout_${route}_${s}`;
  return {
    [`layout_megc_${route}_announcement`]: {
      key: `layout_megc_${route}_announcement`,
      name: "announcement",
      label: "Announcement",
      display: "block",
      sub_fields: [
        { key: k("ann_eyebrow"), label: "Small line above", name: "eyebrow", type: "text", instructions: "Optional. e.g. “New single” or “Award season”." },
        { key: k("ann_headline"), label: "Headline", name: "headline", type: "text", instructions: "What people read first. Required — a block without a headline does not show.", required: 1 },
        { key: k("ann_body"), label: "Text", name: "body", type: "textarea", instructions: "Optional. A sentence or two.", rows: 3 },
        { key: k("ann_link_label"), label: "Link text", name: "link_label", type: "text", instructions: "Optional. e.g. “Listen now”. Needs a link address too." },
        { key: k("ann_link_url"), label: "Link address", name: "link_url", type: "url", instructions: "Optional. Where the link goes." },
      ],
    },
    [`layout_megc_${route}_pull_quote`]: {
      key: `layout_megc_${route}_pull_quote`,
      name: "pull_quote",
      label: "Pull quote",
      display: "block",
      sub_fields: [
        { key: k("quote_text"), label: "Quote", name: "quote", type: "textarea", instructions: "The quote itself, without quotation marks. Required.", required: 1, rows: 3 },
        { key: k("quote_attribution"), label: "Who said it", name: "attribution", type: "text", instructions: "e.g. “Americana Highways”." },
      ],
    },
    [`layout_megc_${route}_video`]: {
      key: `layout_megc_${route}_video`,
      name: "video",
      label: "Video",
      display: "block",
      sub_fields: [
        { key: k("video_url"), label: "YouTube link", name: "youtube_url", type: "url", instructions: "Any YouTube link — watch, Shorts, or share. Required.", required: 1 },
        { key: k("video_caption"), label: "Caption", name: "caption", type: "text", instructions: "Optional. One line under the video." },
      ],
    },
    [`layout_megc_${route}_text`]: {
      key: `layout_megc_${route}_text`,
      name: "text",
      label: "Text section",
      display: "block",
      sub_fields: [
        { key: k("text_heading"), label: "Heading", name: "heading", type: "text", instructions: "Shown between the ★★★ like every section heading. Required.", required: 1 },
        { key: k("text_body"), label: "Paragraphs", name: "body", type: "textarea", instructions: "Leave an empty line between paragraphs. Required — a section with no text does not show.", required: 1, rows: 8, new_lines: "" },
      ],
    },
    [`layout_megc_${route}_photo`]: {
      key: `layout_megc_${route}_photo`,
      name: "photo",
      label: "Photo",
      display: "block",
      sub_fields: [
        { key: k("photo_image"), label: "Photo", name: "image", type: "image", return_format: "array", preview_size: "medium", library: "all", instructions: "Required. The photo's own “Alternative Text” in the Media Library is what a screen reader hears — set it there." , required: 1 },
        { key: k("photo_caption"), label: "Caption", name: "caption", type: "text", instructions: "Optional. One line under the photo." },
      ],
    },
  };
}

function sectionLayouts(r: RouteLayout) {
  return Object.fromEntries(
    r.sections.map((s) => [
      `layout_megc_${r.route}_section_${s.id}`,
      {
        key: `layout_megc_${r.route}_section_${s.id}`,
        name: `section_${s.id}`,
        label: `Section: ${s.label}`,
        display: "row",
        max: 1,
        sub_fields: [
          {
            key: `field_megc_layout_${r.route}_section_${s.id}_hidden`,
            label: "Hide this section",
            name: "hidden",
            type: "true_false",
            ui: 1,
            default_value: 0,
            instructions: s.help,
          },
        ],
      },
    ]),
  );
}

function group(r: RouteLayout) {
  return {
    key: `group_megc_layout_${r.route}`,
    title: r.title,
    fields: [
      {
        key: `field_megc_layout_${r.route}`,
        label: "Page layout",
        name: `layout_${r.route}`,
        type: "flexible_content",
        button_label: "Add a section or a block",
        instructions:
          "The order of this page, top to bottom, under its heading. Add the page's own sections to drag them into a new order or hide one; add a block — an announcement, a quote, a video, a text section, a photo — to put something new between them. Anything you leave out keeps its usual place after what you list. Leave the whole list empty and the page looks exactly as it does today.",
        layouts: { ...sectionLayouts(r), ...blockLayouts(r.route) },
      },
    ],
    location: r.pageIds.map((id) => [{ param: "page", operator: "==", value: String(id) }]),
    menu_order: 50,
    position: "normal",
    style: "default",
    label_placement: "top",
    instruction_placement: "label",
    active: true,
    show_in_rest: 1,
    description: "Generated from src/lib/page-layouts.ts by scripts/wp-plugin/build-layout-groups.ts — do not edit by hand.",
  };
}

let drift = 0;
const expected = new Set<string>();
for (const r of PAGE_LAYOUTS) {
  const file = path.join(OUT_DIR, `group_megc_layout_${r.route}.json`);
  expected.add(path.basename(file));
  const json = JSON.stringify(group(r), null, 2) + "\n";
  if (CHECK) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (current !== json) {
      drift++;
      console.error(`layout:check — ${path.basename(file)} ${current ? "differs from" : "is missing; would be produced by"} the registry`);
    }
  } else {
    writeFileSync(file, json);
    console.log(`wrote ${path.basename(file)} (${r.sections.length} sections)`);
  }
}
// A group whose route left the registry must leave the plugin too.
for (const f of readdirSync(OUT_DIR)) {
  if (f.startsWith("group_megc_layout_") && !expected.has(f)) {
    drift++;
    console.error(`layout:check — ${f} has no route in the registry; delete it`);
  }
}
if (CHECK) {
  if (drift) {
    console.error(`${drift} layout group(s) out of step — run \`npm run layout:build\` and commit.`);
    process.exit(1);
  }
  console.log(`layout:check — ${PAGE_LAYOUTS.length} groups match the registry`);
}
