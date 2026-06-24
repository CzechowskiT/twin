/**
 * Candidate calendar readiness surface — route and copy guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_CALENDAR_READINESS_MARKERS,
  CANDIDATE_CALENDAR_READINESS_ROUTE,
  candidateCalendarReadinessHref,
  resolveCandidateCalendarReadiness,
} from "../src/lib/candidate-calendar-readiness";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /calendar synced/i,
  /event created/i,
  /invite sent/i,
  /microsoft calendar connected/i,
  /google calendar connected/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 readiness route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/calendar/readiness/page.tsx")));
  assert.equal(candidateCalendarReadinessHref(), CANDIDATE_CALENDAR_READINESS_ROUTE);
});

test("2 workspace renders section markers", () => {
  const ws = read("src/components/candidate/candidate-calendar-readiness-workspace.tsx");
  assert.match(ws, /CANDIDATE_CALENDAR_READINESS_MARKERS\.stage/);
  assert.match(ws, /CANDIDATE_CALENDAR_READINESS_MARKERS\.providers/);
  assert.match(ws, /CANDIDATE_CALENDAR_READINESS_MARKERS\.blocked/);
  assert.match(ws, /MicrosoftCalendarReadinessBusyReadPanel/);
  assert.match(ws, /deriveMicrosoftFromCalendar/);
});

test("3 demo record resolves for candidate", () => {
  const record = resolveCandidateCalendarReadiness();
  assert.ok(record);
  assert.equal(record?.providers.length, 4);
});

test("4 i18n candidateCalendarReadiness keys in en and pl", () => {
  assert.ok(en.candidateCalendarReadiness.pageTitle);
  assert.ok(dictionaries.pl.candidateCalendarReadiness.pageTitle);
});

test("5 package.json exposes candidate calendar readiness test", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:candidate-calendar-readiness/);
  assert.match(pkg, /test:candidate-calendar-readiness-browser/);
  assert.match(pkg, /verify:prod-candidate-calendar-readiness/);
});

test("6 no forbidden sync copy in workspace or i18n", () => {
  const blob =
    read("src/components/candidate/candidate-calendar-readiness-workspace.tsx") +
    JSON.stringify(en.candidateCalendarReadiness) +
    JSON.stringify(dictionaries.pl.candidateCalendarReadiness);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("7 page marker constant", () => {
  assert.equal(CANDIDATE_CALENDAR_READINESS_MARKERS.page, "candidate-calendar-readiness-page");
});
