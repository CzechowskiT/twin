/**
 * Wave C Slice 1 — recruiter workspace activation guard (2026-07-13).
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
import { RECRUITER_ACTIVATION_API_PATH } from "../src/lib/recruiter-activation-api";
import {
  RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS,
  RECRUITER_ACTIVATION_SHIP_STATUS,
  SHOW_RECRUITER_HUB_ACTIVATION_PANEL,
} from "../src/lib/seven-day-c-recruiter";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_C1_DOC = "docs/ALL_MODULES_GREEN_WAVE_C1_RECRUITER_ACTIVATION_2026-07-13.md";
const BATCH_DECISION_DOC = "docs/AUTONOMOUS_BATCH_DECISION_2026-07-13.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";
const PILOT_TRACKER = "docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md";
const BACKEND_SERVICE = "backend/app/services/recruiter_activation_persistence.py";
const BACKEND_TESTS = "backend/tests/test_recruiter_activation_persistence.py";
const MIGRATION = "backend/alembic/versions/071_recruiter_workspace_activation.py";
const RECRUITER_PAGE = "src/app/recruiter/page.tsx";
const ACTIVATION_PANEL = "src/components/recruiter/recruiter-activation-panel.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 wave C1 doc exists with stance and activation event reference", () => {
  const doc = readRepo(WAVE_C1_DOC);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /first decision/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(doc, /LIMITED_RECRUITER_PILOT_TRACKER/);
});

test("2 batch decision doc — Wave C chosen, #448 not merged", () => {
  const doc = readRepo(BATCH_DECISION_DOC);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /#448.*OPEN|PR #448.*OPEN/i);
  assert.match(doc, /c2a08b0/);
});

test("3 master plan references Wave C slice 1", () => {
  const doc = readRepo(MASTER_PLAN);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /Slice 1.*shipped.*Recruiter workspace activation/i);
  assert.match(doc, /WAVE_C1_RECRUITER_ACTIVATION/);
});

test("4 backend persistence — migration, service, 8+ tests", () => {
  const migration = readRepo(MIGRATION);
  assert.match(migration, /recruiter_workspace_activation/);
  assert.match(migration, /recruiter_activation_events/);
  const service = readRepo(BACKEND_SERVICE);
  assert.match(service, /record_first_decision/);
  assert.match(service, /first_decision/);
  const tests = readRepo(BACKEND_TESTS);
  const testCount = (tests.match(/^def test_/gm) ?? []).length;
  assert.ok(testCount >= 8, `expected 8+ tests, got ${testCount}`);
});

test("5 frontend hub — activation panel wired, honest PILOT", () => {
  assert.equal(SHOW_RECRUITER_HUB_ACTIVATION_PANEL, true);
  const page = read(RECRUITER_PAGE);
  assert.match(page, /RecruiterActivationPanel/);
  const panel = read(ACTIVATION_PANEL);
  assert.match(panel, /recruiterActivationQuery/);
  assert.match(panel, /data-recruiter-activation-loading/);
  assert.match(panel, /data-recruiter-activation-empty/);
  assert.match(panel, /data-recruiter-activation-panel/);
  assert.match(panel, /data-recruiter-activation-error/);
});

test("6 module activation — daily cockpit PILOT until founder smoke", () => {
  const entry = getWorkspaceModuleActivationEntry("recruiter_daily_cockpit");
  assert.ok(entry);
  if (RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(entry!.activationStatus, "PILOT");
    assert.equal(entry!.green, false);
    assert.equal(RECRUITER_ACTIVATION_SHIP_STATUS, "pilot");
  }
});

test("7 workspace module card — daily cockpit pilot status", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "daily_cockpit");
  assert.ok(mod);
  if (RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(mod!.status, "pilot");
  }
});

test("8 no fake LIVE without browser smoke pass", () => {
  if (RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.notEqual(RECRUITER_ACTIVATION_SHIP_STATUS, "live");
    const entry = getWorkspaceModuleActivationEntry("daily_cockpit");
    assert.notEqual(entry!.activationStatus, "LIVE");
  }
});

test("9 canonical stance locked — no launch GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
  const activation = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "daily_cockpit");
  assert.ok(activation);
  assert.match(activation!.nextAction, /Wave C|smoke|activation/i);
});

test("10 pilot tracker defines activation event as first decision", () => {
  const doc = readRepo(PILOT_TRACKER);
  assert.match(doc, /First decision/);
  assert.match(doc, /First queue load/);
});

test("11 API proxy route forwards activation upstream", () => {
  const route = read("src/app/api/recruiter/activation/route.ts");
  assert.match(route, /\/api\/v1\/recruiter\/activation/);
});

test("12 excluded scopes unchanged", () => {
  const doc = readRepo(WAVE_C1_DOC);
  assert.match(doc, /ATS writeback/);
  assert.match(doc, /calendar live sync/i);
  assert.match(doc, /auto-apply.*PAUSED|PAUSED.*auto-apply/i);
});

test("13 npm script registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:all-modules-green-wave-c1-recruiter-activation-guard/);
});
