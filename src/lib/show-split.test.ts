import { test } from "node:test";
import assert from "node:assert/strict";
import type { TribeEvent } from "./api/events";
import { splitShows } from "./show-split";

function show(
  id: number,
  start: string,
  utcEnd: string | undefined,
  extra: Partial<TribeEvent> = {},
): TribeEvent {
  return {
    id,
    global_id: String(id),
    status: "publish",
    title: `Show ${id}`,
    description: "",
    excerpt: "",
    url: "",
    start_date: start,
    end_date: start,
    utc_end_date: utcEnd,
    all_day: false,
    ...extra,
  };
}

// 2026-10-07 18:30–20:30 MDT, the show that vanished mid-set. 01:13 UTC on the
// 8th is 19:13 MDT on the 7th: started, not over.
const midSet = Date.UTC(2026, 9, 8, 1, 13);
const solo = show(1, "2026-10-07 18:30:00", "2026-10-08 02:30:00");

test("a show that has started but not ended stays upcoming", () => {
  const { upcoming, past } = splitShows([solo], midSet);
  assert.deepEqual(upcoming.map((e) => e.id), [1]);
  assert.deepEqual(past, []);
});

test("a show moves to past the moment it ends", () => {
  const atEnd = Date.UTC(2026, 9, 8, 2, 30);
  assert.deepEqual(splitShows([solo], atEnd - 1000).upcoming.map((e) => e.id), [1]);
  const { upcoming, past } = splitShows([solo], atEnd);
  assert.deepEqual(upcoming, []);
  assert.deepEqual(past.map((e) => e.id), [1]);
});

test("upcoming sorts soonest first, past most recent first", () => {
  const events = [
    show(10, "2019-04-26 20:00:00", "2019-04-26 20:00:00"),
    show(11, "2026-10-21 18:00:00", "2026-10-22 03:00:00"),
    show(12, "2026-09-19 11:00:00", "2026-09-19 18:00:00"),
    show(13, "2026-10-10 18:00:00", "2026-10-11 03:00:00"),
  ];
  const { upcoming, past } = splitShows(events, midSet);
  assert.deepEqual(upcoming.map((e) => e.id), [13, 11]);
  assert.deepEqual(past.map((e) => e.id), [12, 10]);
});

test("just added lists upcoming shows newest publish first", () => {
  const events = [
    show(20, "2026-10-10 18:00:00", "2026-10-11 03:00:00", { date: "2026-01-02 09:00:00" }),
    show(21, "2026-10-21 18:00:00", "2026-10-22 03:00:00", { date: "2026-09-30 09:00:00" }),
    show(22, "2026-09-19 11:00:00", "2026-09-19 18:00:00", { date: "2026-10-01 09:00:00" }),
  ];
  assert.deepEqual(splitShows(events, midSet).justAdded.map((e) => e.id), [21, 20]);
});

test("a payload without utc_end_date falls back to end_date", () => {
  const legacy = show(30, "2026-10-08 00:00:00", undefined, { end_date: "2026-10-08 02:00:00" });
  assert.deepEqual(splitShows([legacy], midSet).upcoming.map((e) => e.id), [30]);
});

test("an event repeated across archive pages lists once", () => {
  const { upcoming } = splitShows([solo, { ...solo }], midSet);
  assert.equal(upcoming.length, 1);
});
