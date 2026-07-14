/**
 * Wave C3 — recruiter notification preferences guard (tooling + implementation).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { WAVE_API_CONTRACTS, diffContractFields } from "./lib/openapi-contract-baseline";
import { WAVE_070_077_CHAIN, waveStack077Fixture } from "./lib/alembic-migration-graph";
import {
  RECRUITER_NOTIFICATION_PREFS_API_PATH,
  RECRUITER_NOTIFICATION_PREFS_ROUTE,
  RECRUITER_C3_BROWSER_SMOKE_STATUS,
  RECRUITER_NOTIFICATION_PREFS_SHIP_STATUS,
} from "../src/lib/seven-day-c3-recruiter";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_C3_DOC = "docs/ALL_MODULES_GREEN_WAVE_C3_NOTIFICATION_PREFS_2026-07-13.md";
const DECISION_DOC = "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C3_C5_2026-07-13.md";
const MIGRATION = "backend/alembic/versions/074_recruiter_notification_preferences_c3.py";
const BACKEND_TESTS = "backend/tests/test_recruiter_c3_notification_prefs.py";
const CLIENT = "src/app/recruiter/notification-preferences/recruiter-notification-prefs-client.tsx";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave C3 doc — in-app only, PILOT", () => {
  const doc = readRepo(WAVE_C3_DOC);
  assert.match(doc, /in-app|notification/i);
  assert.match(doc, /PILOT|pilot/i);
  assert.match(doc, /NO-GO/);
});

test("2 decision doc references C3 migration 074", () => {
  const doc = readRepo(DECISION_DOC);
  assert.match(doc, /074_recruiter_notification_preferences_c3|notification preferences/i);
  assert.match(doc, /C3/i);
});

test("3 migration chain fixture includes 074", () => {
  assert.ok(WAVE_070_077_CHAIN.includes("074_recruiter_notification_preferences_c3"));
});

test("4 API contract C3 fields baseline", () => {
  const drifts = diffContractFields("C3", [...WAVE_API_CONTRACTS.C3.responseFields]);
  assert.equal(drifts.length, 0);
});

test("5 C3 contract marked PR 452", () => {
  assert.equal(WAVE_API_CONTRACTS.C3.pr, 452);
});

test("6 migration 074 exists; parent 072 pre-#448 or 073 post-#448", () => {
  const m = readRepo(MIGRATION);
  assert.match(m, /074_recruiter_notification_preferences_c3/);
  const has073 = /073_candidate_referrals/.test(m);
  const has072 = /072_recruiter_talent_pool_trust_review_c2/.test(m);
  assert.ok(has072 || has073, "down_revision must be 072 (pre-#448) or 073 (post-#448)");
  const targetParent = waveStack077Fixture().find((x) => x.revision === "074_recruiter_notification_preferences_c3")
    ?.downRevision;
  assert.equal(targetParent, "073_candidate_referrals");
});

test("7 backend 10+ tests", () => {
  const tests = readRepo(BACKEND_TESTS);
  const count = (tests.match(/^def test_/gm) ?? []).length;
  assert.ok(count >= 10, `expected 10+ tests, got ${count}`);
});

test("8 frontend client — toggles, save, reset, a11y", () => {
  const client = read(CLIENT);
  assert.match(client, /role="switch"/);
  assert.match(client, /RECRUITER_NOTIFICATION_PREFS_MARKERS\.save/);
  assert.match(client, /RECRUITER_NOTIFICATION_PREFS_MARKERS\.reset/);
  assert.match(client, /inAppOnlyNote/);
});

test("9 API path and route constants", () => {
  assert.equal(RECRUITER_NOTIFICATION_PREFS_API_PATH, "/api/recruiter/notification-preferences");
  assert.equal(RECRUITER_NOTIFICATION_PREFS_ROUTE, "/recruiter/notification-preferences");
});

test("10 ship status pilot; smoke PASS after founder evidence", () => {
  assert.equal(RECRUITER_NOTIFICATION_PREFS_SHIP_STATUS, "pilot");
  assert.equal(RECRUITER_C3_BROWSER_SMOKE_STATUS, "PASS");
});

test("11 no external notification channels in client", () => {
  const client = read(CLIENT);
  assert.doesNotMatch(client, /email|sms|push|slack|webhook/i);
});

test("12 canonical stance unchanged", () => {
  assert.match(CANONICAL_STANCE, /NO-GO/);
});

test("13 i18n keys EN and PL", () => {
  const i18n = read("src/lib/i18n.ts");
  assert.match(i18n, /recruiterNotificationPrefs:/);
  assert.match(i18n, /in_app_inbox_digestLabel/);
  assert.match(i18n, /Preferencje powiadomień/);
});

test("14 no external notification sends in doc", () => {
  const doc = readRepo(WAVE_C3_DOC);
  assert.match(doc, /Excluded/);
  assert.match(doc, /Push notifications|SMS/i);
});
