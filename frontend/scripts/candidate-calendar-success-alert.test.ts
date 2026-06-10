/**
 * Candidate calendar OAuth success alert: contrast, i18n, query-param trigger.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { dictionaries } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("scenario 1: calendar_connected=1 shows dedicated success alert component", () => {
  const page = read("src/app/dashboard/calendar/page.tsx");
  const alert = read("src/components/calendar/calendar-connected-success-alert.tsx");

  assert.match(page, /searchParams\.get\("calendar_connected"\)/);
  assert.match(page, /setBanner\("connected"\)/);
  assert.match(page, /CalendarConnectedSuccessAlert/);
  assert.doesNotMatch(page, /banner === "connected"[\s\S]*dashboard\.calendarConnected[^S]/);
  assert.match(alert, /role="status"/);
  assert.match(alert, /calendarConnectedSuccessTitle/);
  assert.match(alert, /calendarConnectedSuccessBody/);
});

test("scenario 2: PL/EN i18n copy for connected success alert", () => {
  assert.equal(dictionaries.en.dashboard.calendarConnectedSuccessTitle, "Calendar connected");
  assert.equal(
    dictionaries.en.dashboard.calendarConnectedSuccessBody,
    "Your events are now visible in TWIN.",
  );
  assert.equal(dictionaries.pl.dashboard.calendarConnectedSuccessTitle, "Kalendarz połączony");
  assert.equal(
    dictionaries.pl.dashboard.calendarConnectedSuccessBody,
    "Twoje wydarzenia są teraz widoczne w TWIN.",
  );
});

test("scenario 3: alert uses high-contrast emerald classes (not empty placeholder)", () => {
  const alert = read("src/components/calendar/calendar-connected-success-alert.tsx");
  const required = [
    "border-emerald-500",
    "bg-emerald-500",
    "dark:border-emerald-400",
    "dark:bg-emerald-500",
    "dark:text-emerald-50",
    "dark:text-emerald-100",
  ];
  for (const cls of required) {
    assert.match(alert, new RegExp(cls.replace("/", "\\/")));
  }
  assert.doesNotMatch(alert, /TODO|placeholder|FIXME/i);
});

test("scenario 4: existing calendar page query handling preserved", () => {
  const page = read("src/app/dashboard/calendar/page.tsx");
  assert.match(page, /calendar_error/);
  assert.match(page, /setBanner\("denied"\)/);
  assert.match(page, /setBanner\("error"\)/);
  assert.match(page, /candidateCalendarHref/);
});
