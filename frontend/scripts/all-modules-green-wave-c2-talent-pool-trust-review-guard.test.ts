/**
 * Wave C Slice 2 — talent pool + trust review queue guard (2026-07-13).
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
import {
  RECRUITER_TALENT_POOL_API_PATH,
  RECRUITER_TRUST_REVIEW_API_PATH,
  RECRUITER_C2_BROWSER_SMOKE_STATUS,
  RECRUITER_TALENT_POOL_SHIP_STATUS,
  RECRUITER_TRUST_REVIEW_SHIP_STATUS,
} from "../src/lib/seven-day-c2-recruiter";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE_C2_DOC = "docs/ALL_MODULES_GREEN_WAVE_C2_TALENT_POOL_TRUST_REVIEW_2026-07-13.md";
const BATCH_DECISION_DOC = "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C2_2026-07-13.md";
const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";
const MIGRATION = "backend/alembic/versions/072_recruiter_talent_pool_trust_review_c2.py";
const BACKEND_TESTS = "backend/tests/test_recruiter_c2_persistence.py";
const TALENT_POOL_CLIENT = "src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx";
const TRUST_REVIEW_WS = "src/components/recruiter/recruiter-trust-review-queue-workspace.tsx";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 wave C2 doc exists with stance and scope", () => {
  const doc = readRepo(WAVE_C2_DOC);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /Talent Pool/i);
  assert.match(doc, /Trust Review Queue/i);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
});

test("2 batch decision doc — C2 after C1, independent from #448", () => {
  const doc = readRepo(BATCH_DECISION_DOC);
  assert.match(doc, /Wave C.*slice 2|Slice 2/i);
  assert.match(doc, /#448.*OPEN|PR #448.*OPEN/i);
  assert.match(doc, /072_recruiter_talent_pool_trust_review_c2/);
});

test("3 master plan references Wave C slice 2", () => {
  const doc = readRepo(MASTER_PLAN);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /Slice 2.*Talent Pool.*Trust Review/i);
});

test("4 backend persistence — migration 072, 10+ tests", () => {
  const migration = readRepo(MIGRATION);
  assert.match(migration, /072_recruiter_talent_pool_trust_review_c2/);
  assert.match(migration, /recruiter_trust_review_items/);
  assert.match(migration, /recruiter_trust_review_decisions/);
  assert.match(migration, /071_recruiter_workspace_activation/);
  const tests = readRepo(BACKEND_TESTS);
  const testCount = (tests.match(/^def test_/gm) ?? []).length;
  assert.ok(testCount >= 10, `expected 10+ tests, got ${testCount}`);
});

test("5 talent pool frontend — add, filter, detail, archive", () => {
  const client = read(TALENT_POOL_CLIENT);
  assert.match(client, /addRecruiterTalentPoolCandidate/);
  assert.match(client, /archiveRecruiterTalentPoolRecord/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.addForm/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.detailPanel/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.archiveButton/);
});

test("6 trust review frontend — live queue + decisions", () => {
  const ws = read(TRUST_REVIEW_WS);
  assert.match(ws, /postRecruiterTrustReviewDecision/);
  assert.match(ws, /RECRUITER_TRUST_REVIEW_QUEUE_MARKERS\.decisionPanel/);
  assert.match(ws, /RECRUITER_TRUST_REVIEW_QUEUE_MARKERS\.liveTable/);
});

test("7 module activation — talent pool + trust review PILOT until smoke", () => {
  const pool = getWorkspaceModuleActivationEntry("talent_pool");
  const queue = getWorkspaceModuleActivationEntry("trust_review_queue");
  assert.ok(pool);
  assert.ok(queue);
  if (RECRUITER_C2_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(pool!.activationStatus, "PILOT");
    assert.equal(queue!.activationStatus, "PILOT");
    assert.equal(pool!.green, false);
    assert.equal(queue!.green, false);
    assert.equal(RECRUITER_TALENT_POOL_SHIP_STATUS, "pilot");
    assert.equal(RECRUITER_TRUST_REVIEW_SHIP_STATUS, "pilot");
  }
});

test("8 workspace module cards — pilot status", () => {
  const pool = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "talent_pool");
  const queue = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "trust_review_queue");
  assert.ok(pool);
  assert.ok(queue);
  if (RECRUITER_C2_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.equal(pool!.status, "pilot");
    assert.equal(queue!.status, "pilot");
  }
});

test("9 no fake LIVE without browser smoke pass", () => {
  if (RECRUITER_C2_BROWSER_SMOKE_STATUS === "NEEDS_FOUNDER_AUTH_SMOKE") {
    assert.notEqual(RECRUITER_TALENT_POOL_SHIP_STATUS, "live");
    assert.notEqual(RECRUITER_TRUST_REVIEW_SHIP_STATUS, "live");
  }
});

test("10 canonical stance locked — no launch GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
});

test("11 API proxy routes registered", () => {
  assert.match(read("src/app/api/recruiter/talent-pool/candidates/route.ts"), /talent-pool\/candidates/);
  assert.match(read("src/app/api/recruiter/trust-review-queue/route.ts"), /trust-review-queue/);
  assert.equal(RECRUITER_TALENT_POOL_API_PATH, "/api/recruiter/talent-pool");
  assert.equal(RECRUITER_TRUST_REVIEW_API_PATH, "/api/recruiter/trust-review-queue");
});

test("12 C2 independent from R1 activation — no first_decision hook change", () => {
  const c1Service = readRepo("backend/app/services/recruiter_activation_persistence.py");
  assert.match(c1Service, /record_first_decision/);
  const c2Service = readRepo("backend/app/services/recruiter_trust_review_persistence.py");
  assert.doesNotMatch(c2Service, /record_first_decision/);
});

test("13 excluded scopes unchanged", () => {
  const doc = readRepo(WAVE_C2_DOC);
  assert.match(doc, /ATS writeback/);
  assert.match(doc, /auto-apply.*PAUSED|PAUSED.*auto-apply/i);
  assert.match(doc, /Trust Center|consent/i);
});

test("14 npm script registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:all-modules-green-wave-c2-talent-pool-trust-review-guard/);
});

test("15 activation matrix nextAction mentions C2 or smoke", () => {
  const pool = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "talent_pool");
  assert.ok(pool);
  assert.match(pool!.nextAction, /Wave C|smoke|pool|trust/i);
});
