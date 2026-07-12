/**
 * Wave B Slice 3 — candidate referrals full persistence guard (2026-07-12).
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
  CANDIDATE_REFERRALS_API_PATH,
  CANDIDATE_REFERRALS_ENSURE_CODE_PATH,
  CANDIDATE_REFERRALS_INVITE_PATH,
} from "../src/lib/candidate-referrals-api";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  REFERRALS_BROWSER_SMOKE_STATUS,
  REFERRALS_LIMITED_PILOT,
  REFERRALS_SHIP_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_B3_DOC = "docs/ALL_MODULES_GREEN_WAVE_B3_CANDIDATE_REFERRALS_2026-07-10.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";
const PR_447_MERGE_SHA = "c2a08b025ca950b341540f0bc80f710825c778ce";
const REFERRALS_PAGE = "src/app/dashboard/referrals/page.tsx";
const REFERRALS_DASHBOARD = "src/components/referrals/referrals-dashboard.tsx";
const REFERRALS_API_LIB = "src/lib/candidate-referrals-api.ts";
const BACKEND_SERVICE = "backend/app/services/candidate_referral_persistence.py";
const BACKEND_TESTS = "backend/tests/test_candidate_referral_persistence.py";
const MIGRATION = "backend/alembic/versions/071_candidate_referrals.py";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 wave B3 doc exists with stance and PR #447 merge SHA", () => {
  const doc = readRepo(WAVE_B3_DOC);
  assert.match(doc, /Wave B/i);
  assert.match(doc, /Referrals/i);
  assert.match(doc, new RegExp(PR_447_MERGE_SHA));
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
});

test("2 master plan references Wave B slice 3 referrals", () => {
  const doc = readRepo(MASTER_PLAN);
  assert.match(doc, /Slice 3.*Referrals/i);
  assert.match(doc, /WAVE_B3_CANDIDATE_REFERRALS/);
});

test("3 backend persistence — migration, service, 15+ tests", () => {
  const migration = readRepo(MIGRATION);
  assert.match(migration, /candidate_referral_programs/);
  assert.match(migration, /candidate_referrals/);
  assert.match(migration, /uq_candidate_referral_programs_referral_code/);
  assert.match(readRepo(BACKEND_SERVICE), /ensure_referral_program/);
  assert.match(readRepo(BACKEND_SERVICE), /attach_signup_to_candidate_referral/);
  const tests = readRepo(BACKEND_TESTS);
  const testCount = (tests.match(/^def test_/gm) ?? []).length;
  assert.ok(testCount >= 15, `expected 15+ tests, got ${testCount}`);
});

test("4 frontend referrals — API load, share, invite, list", () => {
  const dashboard = read(REFERRALS_DASHBOARD);
  const lib = read(REFERRALS_API_LIB);
  assert.match(dashboard, /CANDIDATE_REFERRALS_API_PATH/);
  assert.match(lib, new RegExp(CANDIDATE_REFERRALS_API_PATH.replace(/\//g, "\\/")));
  assert.match(lib, new RegExp(CANDIDATE_REFERRALS_ENSURE_CODE_PATH.replace(/\//g, "\\/")));
  assert.match(lib, new RegExp(CANDIDATE_REFERRALS_INVITE_PATH.replace(/\//g, "\\/")));
  assert.match(dashboard, /data-candidate-referrals-dashboard/);
  assert.match(dashboard, /data-candidate-referrals-how-it-works/);
  assert.match(dashboard, /data-candidate-referrals-list/);
});

test("5 module activation — PILOT until founder browser smoke", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, false);
  const entry = getWorkspaceModuleActivationEntry("candidate_referrals");
  const card = getWorkspaceModuleActivationEntry("referrals");
  assert.ok(entry);
  assert.ok(card);
  if (REFERRALS_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(entry!.activationStatus, "PILOT");
    assert.equal(card!.activationStatus, "PILOT");
    assert.equal(entry!.green, false);
    assert.equal(REFERRALS_SHIP_STATUS, "pilot");
  }
});

test("6 SoR route — referrals visible with honest status", () => {
  const route = getSystemOfRecordRoutesForPersona("candidate").find((r) => r.id === "candidate_referrals");
  assert.ok(route);
  assert.equal(route!.href, "/dashboard/referrals");
  if (REFERRALS_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(route!.status, "pilot");
  }
});

test("7 workspace card — status matches ship flag", () => {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "referrals");
  assert.ok(mod);
  assert.equal(mod!.status, REFERRALS_SHIP_STATUS);
});

test("8 pilot boundary banner on page", () => {
  const page = read(REFERRALS_PAGE);
  assert.match(page, /REFERRALS_LIMITED_PILOT/);
  assert.equal(REFERRALS_LIMITED_PILOT, true);
});

test("9 no fake LIVE without browser smoke pass", () => {
  if (REFERRALS_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.notEqual(REFERRALS_SHIP_STATUS, "live");
    const entry = getWorkspaceModuleActivationEntry("candidate_referrals");
    assert.notEqual(entry!.activationStatus, "LIVE");
  }
});

test("10 canonical stance locked — no launch GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
  const activation = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "candidate_referrals");
  assert.ok(activation);
  assert.match(activation!.nextAction, /smoke|persistence/i);
});

test("11 npm script registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:all-modules-green-wave-b3-referrals-guard/);
});

test("12 signup attribution wired", () => {
  const signup = readRepo("backend/app/services/signup_referrer.py");
  assert.match(signup, /resolve_referrer_user_id_from_candidate_code/);
  const auth = readRepo("backend/app/api/auth.py");
  assert.match(auth, /attach_signup_to_candidate_referral/);
});

test("13 no auto-outreach promises", () => {
  const doc = readRepo(WAVE_B3_DOC);
  assert.match(doc, /Automatic referral outreach/i);
  const service = readRepo(BACKEND_SERVICE);
  assert.match(service, /NO_OUTREACH_NOTICE/);
});

test("14 excluded scopes unchanged", () => {
  const doc = readRepo(WAVE_B3_DOC);
  assert.match(doc, /Auto-apply.*PAUSED/);
  assert.match(doc, /Delegated apply.*OFF/);
  assert.match(doc, /ATS writeback/);
});

test("15 public resolve endpoint present", () => {
  const candidates = readRepo("backend/app/api/candidates.py");
  assert.match(candidates, /\/referrals\/resolve/);
  assert.match(readRepo(BACKEND_SERVICE), /preview_candidate_referral_code/);
});
