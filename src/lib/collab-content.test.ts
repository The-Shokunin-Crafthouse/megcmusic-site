import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCollab } from "./collab-content";

test("groups and their offerings parse in Meg's order; empty offerings and headless groups drop", () => {
  const out = parseCollab({
    collab_groups: [
      {
        heading: "For fans & community",
        blurb: "Come closer than the back row.",
        offerings: [{ title: "The Cave Crew", detail: "" }, { title: "  ", detail: "x" }, { title: "House concerts", detail: "Living rooms and barns" }],
      },
      { heading: "", blurb: "orphan", offerings: [{ title: "dropped with its group" }] },
      { heading: "For business & brands", blurb: "", offerings: false },
    ],
    cave_crew_url: "https://www.facebook.com/groups/1636196277191028/",
  });
  assert.deepEqual(out, {
    groups: [
      {
        heading: "For fans & community",
        blurb: "Come closer than the back row.",
        offerings: [
          { title: "The Cave Crew", detail: "" },
          { title: "House concerts", detail: "Living rooms and barns" },
        ],
      },
      { heading: "For business & brands", blurb: "", offerings: [] },
    ],
    caveCrewUrl: "https://www.facebook.com/groups/1636196277191028/",
  });
});

test("nothing set is an empty page section, not a crash", () => {
  assert.deepEqual(parseCollab(false), { groups: [], caveCrewUrl: "" });
  assert.deepEqual(parseCollab({ collab_groups: false }), { groups: [], caveCrewUrl: "" });
});
