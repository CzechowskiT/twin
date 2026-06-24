/**
 * Microsoft Graph busy-read capability contract — scopes, redaction, copy guardrails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  allBusySlotsRedacted,
  getMicrosoftBusyReadDemo,
  isAllowedMicrosoftBusyReadCapabilityStatus,
  isAllowedMicrosoftOAuthConnectionState,
  MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
  MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
  MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
  MICROSOFT_BUSY_READ_STATUS_ALLOWLIST,
} from "../src/lib/microsoft-busy-read-demo-data";
import {
  microsoftBusyReadConnectDisabled,
  microsoftBusyReadHasForbiddenWriteScope,
  microsoftBusyReadRequiresCalendarsRead,
  resolveMicrosoftBusyRead,
} from "../src/lib/microsoft-busy-read";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /calendar synced/i,
  /event created/i,
  /event updated/i,
  /meeting created/i,
  /invite sent/i,
  /microsoft connected live/i,
  /token stored/i,
  /email sent/i,
  /candidate notified/i,
  /automatic scheduling/i,
  /fully integrated/i,
  /launch ready/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 required scopes include Calendars.Read", () => {
  assert.ok(MICROSOFT_BUSY_READ_REQUIRED_SCOPES.includes("Calendars.Read"));
  assert.ok(microsoftBusyReadRequiresCalendarsRead(MICROSOFT_BUSY_READ_REQUIRED_SCOPES));
});

test("2 forbidden scopes include Calendars.ReadWrite and Mail.Send", () => {
  assert.ok(MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES.includes("Calendars.ReadWrite"));
  assert.ok(MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES.includes("Mail.Send"));
  assert.equal(microsoftBusyReadHasForbiddenWriteScope(["Calendars.ReadWrite"]), true);
});

test("3 busy slot preview redacts subject and details", () => {
  const record = getMicrosoftBusyReadDemo();
  assert.ok(allBusySlotsRedacted(record.busy_slot_preview));
  assert.ok(record.busy_slot_preview.length >= 2);
  for (const slot of record.busy_slot_preview) {
    assert.equal(slot.event_subject_redacted, true);
  }
});

test("4 no write invite sync claims in domain files", () => {
  const blob =
    read("src/lib/microsoft-busy-read-demo-data.ts") + read("src/lib/microsoft-busy-read.ts");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("5 allowed statuses only in allowlists", () => {
  assert.equal(MICROSOFT_BUSY_READ_STATUS_ALLOWLIST.length, 6);
  assert.ok(isAllowedMicrosoftBusyReadCapabilityStatus("demo_busy_slots_available"));
  assert.ok(isAllowedMicrosoftOAuthConnectionState("connect_available"));
  assert.equal(isAllowedMicrosoftBusyReadCapabilityStatus("bogus"), false);
});

test("6 no token or secret fields in contract record", () => {
  const record = getMicrosoftBusyReadDemo();
  const keys = Object.keys(record);
  assert.ok(!keys.some((k) => /token|secret|password/i.test(k)));
});

test("7 resolve returns demo for demo id and null for unknown", () => {
  assert.ok(resolveMicrosoftBusyRead(MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID));
  assert.equal(resolveMicrosoftBusyRead("not-real"), null);
});

test("8 connect gate disabled by default", () => {
  assert.equal(microsoftBusyReadConnectDisabled(), true);
});

test("9 i18n microsoftBusyRead keys in en and pl", () => {
  assert.ok(en.microsoftBusyRead.slotPreviewTitle);
  assert.ok(dictionaries.pl.microsoftBusyRead.oauthGateTitle);
});

test("10 package.json exposes microsoft busy-read contract test", () => {
  assert.match(read("package.json"), /test:microsoft-busy-read-contract/);
});
