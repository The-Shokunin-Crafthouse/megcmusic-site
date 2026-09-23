import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildSharedSections, type AcfGroupJson } from "./shared-sections";
import { PAGE_LAYOUTS, type RouteLayout } from "./page-layouts";

// Two small field groups standing in for the plugin's acf-json.
const GROUPS: AcfGroupJson[] = [
  {
    key: "group_kit",
    location: [[{ param: "page", operator: "==", value: "608" }]],
    fields: [
      { key: "field_kit_lede", name: "page_lede", type: "text" },
      { key: "field_kit_items", name: "kit_items", type: "repeater" },
    ],
  },
  {
    key: "group_music",
    location: [[{ param: "page", operator: "==", value: "5562" }]],
    fields: [{ key: "field_releases", name: "releases", type: "repeater" }],
  },
];

const route = (r: Partial<RouteLayout> & Pick<RouteLayout, "route" | "pageIds" | "sections">): RouteLayout => ({
  title: r.route,
  ...r,
});

test("a section that reads its own page's fields makes no box and nothing shared", () => {
  const out = buildSharedSections(
    [
      route({
        route: "epk",
        pageIds: [608],
        sections: [{ id: "kit", label: "Press Kit", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_items"] }] }],
      }),
    ],
    GROUPS,
  );
  assert.deepEqual(out, { groups: [], boxes: [], links: [] });
});

test("a section that reads another page's fields gets a box on its page, saved to that page", () => {
  const out = buildSharedSections(
    [
      route({
        route: "home",
        pageIds: [4],
        sections: [{ id: "press-kit", label: "Electronic Press Kit", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_items"] }] }],
      }),
      route({
        route: "epk",
        pageIds: [608],
        sections: [{ id: "kit", label: "Press Kit", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_items"] }] }],
      }),
    ],
    GROUPS,
  );
  assert.deepEqual(out.groups, [{ id: "608-kit_items", source: 608, fields: ["field_kit_items"], names: ["kit_items"], shownOn: [4, 608] }]);
  assert.deepEqual(out.boxes, [{ id: "4-608-kit_items", host: 4, group: "608-kit_items", source: 608, sections: ["Electronic Press Kit"] }]);
});

test("two sections on one page that read the same fields share one box, so one save cannot undo the other", () => {
  const releases = [{ kind: "fields" as const, pageId: 5562, fields: ["releases"] }];
  const out = buildSharedSections(
    [
      route({
        route: "home",
        pageIds: [4],
        sections: [
          { id: "discography", label: "Discography", help: "", source: releases },
          { id: "singles", label: "Singles", help: "", source: releases },
        ],
      }),
    ],
    GROUPS,
  );
  assert.equal(out.boxes.length, 1);
  assert.deepEqual(out.boxes[0].sections, ["Discography", "Singles"]);
});

test("a field name no group on that page carries fails the build and names the section", () => {
  assert.throws(
    () =>
      buildSharedSections(
        [route({ route: "home", pageIds: [4], sections: [{ id: "press-kit", label: "EPK", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_itmes"] }] }] })],
        GROUPS,
      ),
    /home\/press-kit.*"kit_itmes".*page 608/,
  );
});

test("a real field that lives on a different page fails the build", () => {
  assert.throws(
    () =>
      buildSharedSections(
        [route({ route: "home", pageIds: [4], sections: [{ id: "d", label: "D", help: "", source: [{ kind: "fields", pageId: 608, fields: ["releases"] }] }] })],
        GROUPS,
      ),
    /"releases".*page 608/,
  );
});

test("one source named with two different field lists fails the build", () => {
  assert.throws(
    () =>
      buildSharedSections(
        [
          route({ route: "a", pageIds: [4], sections: [{ id: "x", label: "X", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_items"] }] }] }),
          route({ route: "b", pageIds: [10], sections: [{ id: "y", label: "Y", help: "", source: [{ kind: "fields", pageId: 608, fields: ["kit_items", "page_lede"] }] }] }),
        ],
        GROUPS,
      ),
    /608-kit_items/,
  );
});

test("content no page can hold an editor for becomes a link on every page of the route", () => {
  const out = buildSharedSections(
    [
      route({
        route: "shows",
        pageIds: [20],
        sections: [{ id: "shows", label: "Shows", help: "", source: [{ kind: "screen", screen: "edit.php?post_type=tribe_events", what: "your shows" }] }],
      }),
      route({
        route: "epk",
        pageIds: [608],
        sections: [{ id: "set-list", label: "Sample Set List", help: "", source: [{ kind: "page", pageId: 3666, what: "the set list itself" }] }],
      }),
    ],
    GROUPS,
  );
  assert.deepEqual(out.links, [
    { host: 20, section: "Shows", screen: "edit.php?post_type=tribe_events", what: "your shows" },
    { host: 608, section: "Sample Set List", page: 3666, what: "the set list itself" },
  ]);
});

// The real registry against the plugin's real field groups: the build that CI runs.
const ACF_DIR = path.join(process.cwd(), "wp-plugin", "megc-site-content", "acf-json");
const realGroups = (): AcfGroupJson[] =>
  readdirSync(ACF_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(ACF_DIR, f), "utf8")) as AcfGroupJson);

test("the real registry builds, and no box points at its own page", () => {
  const out = buildSharedSections(PAGE_LAYOUTS, realGroups());
  assert.ok(out.boxes.length > 0);
  for (const b of out.boxes) assert.notEqual(b.host, b.source, b.id);
});

test("the press-kit downloads are one copy, shown on Home and the EPK page, editable from Home", () => {
  const out = buildSharedSections(PAGE_LAYOUTS, realGroups());
  const kit = out.groups.find((g) => g.id === "608-kit_items");
  assert.deepEqual(kit?.shownOn, [4, 608]);
  assert.ok(out.boxes.some((b) => b.host === 4 && b.group === "608-kit_items"));
});

test("Home's bio is editable from the EPK page, where The Story shows it", () => {
  const out = buildSharedSections(PAGE_LAYOUTS, realGroups());
  const box = out.boxes.find((b) => b.host === 608 && b.source === 4);
  assert.deepEqual(box?.sections, ["The Story"]);
});
