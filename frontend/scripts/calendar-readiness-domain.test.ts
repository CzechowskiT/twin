/**
 * Calendar readiness domain — allowlists, demo record, copy guardrails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CALENDAR_PROVIDER_ALLOWLIST,
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  CALENDAR_READINESS_STAGE_ALLOWLIST,
  OAUTH_CONFIG_STATUS_ALLOWLIST,
  getCalendarReadinessDemo,
  isAllowedCalendarProvider,
  isAllowedCalendarReadinessStage,
  isAllowedOAuthConfigStatus,
} from "../src/lib/calendar-readiness-demo-data";
import {
  calendarReadinessSourceKey,
  mergePublicHealthCalendarFlags,
  microsoftReadinessBlocked,
  resolveCalendarReadiness,
} from "../src/lib/calendar-readiness";
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

test("1 calendar provider allowlist has four providers", () => {
  assert.equal(CALENDAR_PROVIDER_ALLOWLIST.length, 4);
  assert.ok(isAllowedCalendarProvider("microsoft"));
  assert.equal(isAllowedCalendarProvider("bogus"), false);
});

test("2 oauth config status allowlist has four states", () => {
  assert.equal(OAUTH_CONFIG_STATUS_ALLOWLIST.length, 4);
  assert.ok(isAllowedOAuthConfigStatus("partial"));
  assert.equal(isAllowedOAuthConfigStatus("bogus"), false);
});

test("3 readiness stage allowlist has five stages", () => {
  assert.equal(CALENDAR_READINESS_STAGE_ALLOWLIST.length, 5);
  assert.ok(isAllowedCalendarReadinessStage("readiness_preview"));
  assert.equal(isAllowedCalendarReadinessStage("bogus"), false);
});

test("4 demo record has providers and blocked capabilities", () => {
  const record = getCalendarReadinessDemo();
  assert.equal(record.candidate_id, CALENDAR_READINESS_DEMO_CANDIDATE_ID);
  assert.equal(record.providers.length, 4);
  assert.ok(record.blocked_capabilities.length >= 5);
  assert.ok(record.scopes_preview.includes("Calendars.Read"));
  assert.equal(record.scopes_preview.includes("Calendars.ReadWrite"), false);
  assert.equal(record.source, "demo");
});

test("5 resolve returns demo for demo id and null for unknown", () => {
  assert.ok(resolveCalendarReadiness(CALENDAR_READINESS_DEMO_CANDIDATE_ID));
  assert.equal(resolveCalendarReadiness("not-real"), null);
});

test("6 microsoft write remains blocked in demo", () => {
  const record = getCalendarReadinessDemo();
  assert.equal(microsoftReadinessBlocked(record), true);
});

test("7 merge public-health flags updates microsoft configured", () => {
  const record = getCalendarReadinessDemo();
  const merged = mergePublicHealthCalendarFlags(record, { microsoft_calendar_configured: true });
  assert.equal(merged.public_health.microsoft_calendar_configured, true);
  assert.equal(merged.source, "partial");
});

test("8 source badge keys exist in en and pl", () => {
  assert.ok(en.safePersistence.demoFallback);
  assert.ok(dictionaries.pl.safePersistence.liveApi);
  assert.ok(calendarReadinessSourceKey("demo"));
});

test("9 package.json exposes calendar readiness domain test", () => {
  assert.match(read("package.json"), /test:calendar-readiness-domain/);
});

test("10 no forbidden sync or invite copy in demo data", () => {
  const blob = read("src/lib/calendar-readiness-demo-data.ts") + read("src/lib/calendar-readiness.ts");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});
