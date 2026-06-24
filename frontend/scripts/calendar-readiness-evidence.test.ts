/**
 * Calendar readiness operating evidence — route, copy, and resolver guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CALENDAR_READINESS_EVIDENCE_CROSS_LINKS,
  CALENDAR_READINESS_EVIDENCE_DOC,
  CALENDAR_READINESS_EVIDENCE_MARKERS,
  resolveCalendarReadinessEvidence,
} from "../src/lib/calendar-readiness-evidence";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /calendar synced/i,
  /event created/i,
  /invite sent/i,
  /microsoft calendar connected/i,
  /google calendar connected/i,
  /live scheduling automation/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 evidence doc exists", () => {
  assert.ok(existsSync(join(root, "..", CALENDAR_READINESS_EVIDENCE_DOC)));
});

test("2 readiness and calendar workspace routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/calendar/readiness/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/dashboard/calendar/page.tsx")));
});

test("3 evidence panel wired on readiness workspace and calendar page", () => {
  assert.match(
    read("src/components/candidate/candidate-calendar-readiness-workspace.tsx"),
    /CalendarReadinessEvidencePanel/,
  );
  assert.match(read("src/app/dashboard/calendar/page.tsx"), /CalendarOperatingEvidenceSection/);
});

test("4 resolver returns capability matrix with writes disabled", () => {
  const bundle = resolveCalendarReadinessEvidence();
  assert.ok(bundle);
  const writes = bundle?.capabilities.find((c) => c.id === "writes_disabled");
  assert.equal(writes?.status, "blocked");
});

test("5 cross-links include placement verification", () => {
  const hrefs = CALENDAR_READINESS_EVIDENCE_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.some((h) => h.includes("placement-verification")));
});

test("6 i18n keys present in en and pl", () => {
  assert.ok(en.calendarReadinessEvidence.panelTitle);
  assert.ok(dictionaries.pl.calendarReadinessEvidence.panelTitle);
});

test("7 no forbidden sync or write copy", () => {
  const blob =
    read("src/components/shared/calendar-readiness-evidence-panel.tsx") +
    JSON.stringify(en.calendarReadinessEvidence) +
    JSON.stringify(dictionaries.pl.calendarReadinessEvidence);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("8 package.json exposes evidence browser and verify scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:calendar-readiness-evidence/);
  assert.match(pkg, /test:calendar-readiness-evidence-browser/);
  assert.match(pkg, /verify:prod-calendar-readiness-evidence/);
});

test("9 panel marker constant", () => {
  assert.equal(CALENDAR_READINESS_EVIDENCE_MARKERS.panel, "calendar-readiness-evidence-panel");
});
