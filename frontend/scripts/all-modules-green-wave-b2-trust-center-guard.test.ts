/**
 * Wave B Slice 2 — candidate trust center full persistence guard (2026-07-12).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getWorkspaceModuleActivationEntry,
  WORKSPACE_MODULE_ACTIVATION,
} from "../src/lib/all-workspace-modules-activation";
import { WORKSPACE_GREEN_ONLY_MODE } from "../src/lib/all-workspace-green-gate";
import {
  CONSENTS_API_PATH,
  TRUST_CENTER_API_PATH,
  TRUST_AUDIT_EVENTS_API_PATH,
} from "../src/lib/candidate-trust-api";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  TRUST_CENTER_BROWSER_SMOKE_STATUS,
  TRUST_CENTER_SHIP_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_B2_DOC = "docs/ALL_MODULES_GREEN_WAVE_B2_CANDIDATE_TRUST_CENTER_2026-07-10.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";
const PR_446_MERGE_SHA = "1c2547d96d2f921935c14b34fcf927a184435b3d";
const TRUST_WORKSPACE = "src/components/candidate/candidate-trust-center-workspace.tsx";
const TRUST_API_LIB = "src/lib/candidate-trust-api.ts";
const BACKEND_CONSENT = "backend/app/services/candidate_consent_service.py";
const BACKEND_PRIVACY = "backend/app/services/candidate_privacy_request_service.py";
const BACKEND_AUDIT = "backend/app/services/candidate_trust_audit_service.py";
const BACKEND_TESTS = "backend/tests/test_candidate_trust_center_persistence.py";
const MIGRATION = "backend/alembic/versions/070_candidate_trust_center.py";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 wave B2 doc exists with stance and PR #446 merge SHA", () => {
  const doc = readRepo(WAVE_B2_DOC);
  assert.match(doc, /Wave B/i);
  assert.match(doc, /Trust Center/i);
  assert.match(doc, new RegExp(PR_446_MERGE_SHA));
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
});

test("2 master plan references Wave B slice 2 trust center", () => {
  const doc = readRepo(MASTER_PLAN);
  assert.match(doc, /Slice 2.*Trust Center/i);
  assert.match(doc, /WAVE_B2_CANDIDATE_TRUST_CENTER/);
});

test("3 backend persistence — migration, services, 28+ tests", () => {
  const migration = readRepo(MIGRATION);
  assert.match(migration, /candidate_consent_receipts/);
  assert.match(migration, /candidate_privacy_requests/);
  assert.match(migration, /candidate_trust_audit_events/);
  assert.match(readRepo(BACKEND_CONSENT), /grant_consent/);
  assert.match(readRepo(BACKEND_PRIVACY), /create_privacy_request/);
  assert.match(readRepo(BACKEND_AUDIT), /record_trust_audit_event/);
  const tests = readRepo(BACKEND_TESTS);
  const testCount = (tests.match(/^def test_/gm) ?? []).length;
  assert.ok(testCount >= 28, `expected 28+ tests, got ${testCount}`);
});

test("4 frontend trust hub — API load, no demo-only gate for auth users", () => {
  const workspace = read(TRUST_WORKSPACE);
  const lib = read(TRUST_API_LIB);
  assert.match(workspace, /TRUST_CENTER_API_PATH/);
  assert.match(lib, new RegExp(TRUST_CENTER_API_PATH.replace(/\//g, "\\/")));
  assert.match(lib, new RegExp(CONSENTS_API_PATH.replace(/\//g, "\\/")));
  assert.match(lib, new RegExp(TRUST_AUDIT_EVENTS_API_PATH.replace(/\//g, "\\/")));
  assert.match(workspace, /candidate-trust-center-loading/);
  assert.match(workspace, /candidate-trust-center-error/);
  assert.match(workspace, /trustCenterDataToRecord/);
});

test("5 module activation — LIVE after founder browser smoke PASS", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  const trust = getWorkspaceModuleActivationEntry("candidate_trust");
  const hub = getWorkspaceModuleActivationEntry("trust_center");
  assert.ok(trust);
  assert.ok(hub);
  assert.equal(TRUST_CENTER_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(trust!.activationStatus, "LIVE");
  assert.equal(hub!.activationStatus, "LIVE");
  assert.equal(trust!.green, true);
  assert.equal(TRUST_CENTER_SHIP_STATUS, "live");
});

test("6 SoR route — trust center visible with live status", () => {
  const route = getSystemOfRecordRoutesForPersona("candidate").find((r) => r.id === "candidate_trust");
  assert.ok(route);
  assert.equal(route!.href, "/dashboard/trust");
  assert.equal(route!.status, "live");
});

test("7 workspace card — status matches ship flag", () => {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "trust_center");
  assert.ok(mod);
  assert.equal(mod!.status, TRUST_CENTER_SHIP_STATUS);
});

test("8 founder smoke PASS — LIVE activation confirmed", () => {
  assert.equal(TRUST_CENTER_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(TRUST_CENTER_SHIP_STATUS, "live");
  const entry = getWorkspaceModuleActivationEntry("candidate_trust");
  assert.equal(entry!.activationStatus, "LIVE");
});

test("9 canonical stance locked — no launch GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
  const activation = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "candidate_trust");
  assert.ok(activation);
  assert.match(activation!.nextAction, /smoke|persistence/i);
});

test("10 npm script registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:all-modules-green-wave-b2-trust-center-guard/);
});

test("11 privacy requests — manual processing, no auto-complete", () => {
  const doc = readRepo(WAVE_B2_DOC);
  assert.match(doc, /manual processing/i);
  assert.match(doc, /no fake completion/i);
  const privacy = readRepo(BACKEND_PRIVACY);
  assert.match(privacy, /MANUAL_PROCESSING_NOTICE/);
  assert.doesNotMatch(privacy, /status = \"completed\"/);
});

test("12 auth isolation tests present", () => {
  const tests = readRepo(BACKEND_TESTS);
  assert.match(tests, /test_privacy_request_isolation_between_users/);
  assert.match(tests, /test_consent_receipts_isolation/);
});

test("13 idempotency on consent and privacy requests", () => {
  const tests = readRepo(BACKEND_TESTS);
  assert.match(tests, /test_consent_idempotency/);
  assert.match(tests, /test_privacy_request_idempotency/);
});

test("14 all privacy request types supported", () => {
  const tests = readRepo(BACKEND_TESTS);
  assert.match(tests, /test_all_privacy_request_types/);
});

test("15 excluded scopes unchanged", () => {
  const doc = readRepo(WAVE_B2_DOC);
  assert.match(doc, /Auto-apply.*PAUSED/);
  assert.match(doc, /ATS writeback/);
  assert.match(doc, /Microsoft calendar/);
});
