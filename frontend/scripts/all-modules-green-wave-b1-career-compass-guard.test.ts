/**
 * Wave B Slice 1 — candidate career compass full persistence guard (2026-07-12).
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
import { CAREER_COMPASS_API_PATH } from "../src/lib/candidate-career-compass";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  CAREER_COMPASS_BROWSER_SMOKE_STATUS,
  CAREER_COMPASS_SHIP_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_B1_DOC = "docs/ALL_MODULES_GREEN_WAVE_B1_CAREER_COMPASS_2026-07-10.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";
const PR_445_MERGE_SHA = "6d7083e37daf9a88783c938e0c5a661168111e81";
const CAREER_PAGE = "src/app/dashboard/career/page.tsx";
const CAREER_LIB = "src/lib/candidate-career-compass.ts";
const BACKEND_SERVICE = "backend/app/services/candidate_career_compass_persistence.py";
const BACKEND_TESTS = "backend/tests/test_candidate_career_compass_persistence.py";
const MIGRATION = "backend/alembic/versions/069_candidate_career_compass.py";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 wave B1 doc exists with stance and PR #445 merge SHA", () => {
  const doc = readRepo(WAVE_B1_DOC);
  assert.match(doc, /Wave B/i);
  assert.match(doc, /Career Compass/i);
  assert.match(doc, new RegExp(PR_445_MERGE_SHA));
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES/);
  assert.match(doc, /NOT_PHASE_3B/);
});

test("2 master plan references Wave B slice 1 career compass", () => {
  const doc = readRepo(MASTER_PLAN);
  assert.match(doc, /Wave B/i);
  assert.match(doc, /candidate_career_compass/);
});

test("3 backend persistence layer — migration, service, tests", () => {
  const migration = readRepo(MIGRATION);
  assert.match(migration, /candidate_career_compass/);
  assert.match(migration, /uq_candidate_career_compass_candidate_id/);
  const service = readRepo(BACKEND_SERVICE);
  assert.match(service, /career_brief_readiness_complete/);
  assert.match(service, /serialize_compass/);
  const tests = readRepo(BACKEND_TESTS);
  assert.match(tests, /test_get_empty_career_compass/);
  assert.match(tests, /test_readiness_true_when_complete/);
});

test("4 frontend career page — API load/save, no demo hardcoding", () => {
  const page = read(CAREER_PAGE);
  const lib = read(CAREER_LIB);
  assert.match(page, /CAREER_COMPASS_API_PATH/);
  assert.match(lib, new RegExp(CAREER_COMPASS_API_PATH.replace(/\//g, "\\/")));
  assert.match(page, /data-career-compass-form/);
  assert.match(page, /data-career-compass-loading/);
  assert.match(page, /data-career-compass-empty/);
  assert.match(page, /data-career-compass-save-success/);
  assert.match(lib, /CAREER_COMPASS_API_PATH/);
  assert.doesNotMatch(page, /data-seven-day-career-static-framework/);
  assert.doesNotMatch(page, /readiness_score/);
  assert.doesNotMatch(page, /regenerate_path/);
  assert.doesNotMatch(page, /VP Engineering/);
});

test("5 module activation — LIVE after founder browser smoke PASS", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  const entry = getWorkspaceModuleActivationEntry("candidate_career_compass");
  assert.ok(entry);
  assert.equal(CAREER_COMPASS_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(entry!.activationStatus, "LIVE");
  assert.equal(entry!.green, true);
  assert.equal(CAREER_COMPASS_SHIP_STATUS, "live");
});

test("6 SoR route — career compass visible with live status", () => {
  const route = getSystemOfRecordRoutesForPersona("candidate").find((r) => r.id === "candidate_career_compass");
  assert.ok(route);
  assert.equal(route!.href, "/dashboard/career");
  assert.equal(route!.status, "live");
});

test("7 workspace card — status matches ship flag", () => {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "career_compass");
  assert.ok(mod);
  assert.equal(mod!.status, CAREER_COMPASS_SHIP_STATUS);
});

test("8 canonical stance locked — no launch GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
  const activation = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "candidate_career_compass");
  assert.ok(activation);
  assert.match(activation!.nextAction, /Maintain|persistence|smoke/i);
});
