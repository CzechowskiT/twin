/**
 * Regression: Google/provider events grouped by local calendar date (not UTC ISO date).
 */
import assert from "node:assert/strict";

import {
  eventLocalCalendarDateKey,
  eventsByDay,
  toLocalCalendarDateKey,
  type DisplayCalendarEvent,
} from "../src/lib/calendar-week";

const WARSAW = "Europe/Warsaw";

/** Monday 2026-05-25 00:00 Europe/Warsaw (CEST). */
const WEEK_START_MONDAY_WARSAW = new Date("2026-05-24T22:00:00.000Z");

function ev(
  id: string,
  start_iso: string,
  all_day: boolean,
): DisplayCalendarEvent {
  return {
    id,
    title: id,
    start_iso,
    end_iso: start_iso,
    all_day,
    html_link: null,
    source: "provider",
  };
}

// --- toLocalCalendarDateKey ---
assert.equal(
  toLocalCalendarDateKey(new Date("2026-05-25T05:15:00.000Z"), WARSAW),
  "2026-05-25",
  "timed UTC instant maps to Warsaw calendar Monday",
);

assert.equal(
  toLocalCalendarDateKey(WEEK_START_MONDAY_WARSAW, WARSAW),
  "2026-05-25",
  "week column Monday uses Warsaw date, not UTC Sunday",
);

// --- eventLocalCalendarDateKey ---
assert.equal(
  eventLocalCalendarDateKey("2026-05-25T07:15:00+02:00", false, WARSAW),
  "2026-05-25",
  "offset datetime groups on local Monday",
);

assert.equal(
  eventLocalCalendarDateKey("2026-05-27", true, WARSAW),
  "2026-05-27",
  "all-day date-only is not shifted via UTC midnight",
);

// --- eventsByDay week 25–31 May 2026 ---
const weekStart = WEEK_START_MONDAY_WARSAW;
const timedMonday = ev("timed-mon", "2026-05-25T07:15:00+02:00", false);
const allDayWed = ev("all-wed", "2026-05-27", true);

const days = eventsByDay([timedMonday, allDayWed], weekStart, "en-US", WARSAW);

assert.equal(days.length, 7);
assert.equal(days[0]?.dayKey, "2026-05-25");
assert.equal(days[2]?.dayKey, "2026-05-27");
assert.deepEqual(
  days[0]?.items.map((e) => e.id),
  ["timed-mon"],
  "Monday timed event stays on Monday column",
);
assert.deepEqual(
  days[2]?.items.map((e) => e.id),
  ["all-wed"],
  "Wednesday all-day stays on Wednesday column",
);
assert.equal(days[1]?.items.length, 0, "Tuesday has no Monday spillover");

console.log("calendar-week-timezone.test.ts: ok");
