/**
 * Microsoft Graph busy-read readiness domain — allowlists, demo record, copy guardrails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getCalendarReadinessDemo } from "../src/lib/calendar-readiness-demo-data";
import {
  deriveMicrosoftFromCalendar,
  getMicrosoftCalendarReadinessDemo,
  isAllowedMicrosoftBusyReadStage,
  mergeMicrosoftPublicHealthFlag,
  microsoftBusyReadPreviewOnly,
  microsoftBusyReadStageKey,
  microsoftGraphWriteBlocked,
  MICROSOFT_BUSY_READ_STAGE_ALLOWLIST,
  MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  resolveMicrosoftCalendarReadiness,
} from "../src/lib/microsoft-calendar-readiness";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /calendar synced/i,
  /event created/i,
  /invite sent/i,
  /microsoft calendar connected/i,
  /google calendar connected/i,
  /email sent/i,
  /notification sent/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 microsoft busy-read stage allowlist has five stages", () => {
  assert.equal(MICROSOFT_BUSY_READ_STAGE_ALLOWLIST.length, 5);
  assert.ok(isAllowedMicrosoftBusyReadStage("busy_read_preview"));
  assert.equal(isAllowedMicrosoftBusyReadStage("bogus"), false);
});

test("2 demo record has microsoft busy-read preview fields", () => {
  const record = getMicrosoftCalendarReadinessDemo();
  assert.equal(record.candidate_id, MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID);
  assert.equal(record.busy_read, "preview_only");
  assert.equal(record.event_write, "blocked");
  assert.ok(record.scopes_preview.includes("Calendars.Read"));
  assert.ok(record.blocked_capabilities.length >= 3);
});

test("3 resolve returns demo for demo id and null for unknown", () => {
  assert.ok(resolveMicrosoftCalendarReadiness(MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID));
  assert.equal(resolveMicrosoftCalendarReadiness("not-real"), null);
});

test("4 graph write remains blocked in demo", () => {
  const record = getMicrosoftCalendarReadinessDemo();
  assert.equal(microsoftGraphWriteBlocked(record), true);
  assert.equal(microsoftBusyReadPreviewOnly(record), true);
});

test("5 derive from shared calendar record extracts microsoft provider", () => {
  const base = getCalendarReadinessDemo();
  const derived = deriveMicrosoftFromCalendar(base);
  assert.equal(derived.oauth_status, "partial");
  assert.equal(derived.busy_read, "preview_only");
});

test("6 merge public-health flag updates microsoft configured", () => {
  const record = getMicrosoftCalendarReadinessDemo();
  const merged = mergeMicrosoftPublicHealthFlag(record, true);
  assert.equal(merged.public_health_flag, true);
  assert.equal(merged.source, "partial");
});

test("7 stage badge keys exist in en and pl", () => {
  assert.ok(en.microsoftCalendarReadiness.stageBusyReadPreview);
  assert.ok(dictionaries.pl.microsoftCalendarReadiness.stageBusyReadPreview);
  assert.ok(microsoftBusyReadStageKey("busy_read_preview"));
});

test("8 package.json exposes microsoft calendar readiness domain test", () => {
  assert.match(read("package.json"), /test:microsoft-calendar-readiness-domain/);
});

test("9 no forbidden sync or invite copy in microsoft domain files", () => {
  const blob =
    read("src/lib/microsoft-calendar-readiness-demo-data.ts") +
    read("src/lib/microsoft-calendar-readiness.ts");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("10 merges with calendar-readiness without duplicating provider allowlist", () => {
  const ms = resolveMicrosoftCalendarReadiness();
  const cal = getCalendarReadinessDemo();
  assert.ok(ms);
  assert.equal(ms?.candidate_id, cal.candidate_id);
});
