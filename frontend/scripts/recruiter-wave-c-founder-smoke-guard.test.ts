/**
 * Recruiter Wave C founder smoke guard — C1/C2 stay PILOT until runbook PASS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS,
  RECRUITER_ACTIVATION_SHIP_STATUS,
} from "../src/lib/seven-day-c-recruiter";
import {
  RECRUITER_C2_BROWSER_SMOKE_STATUS,
  RECRUITER_TALENT_POOL_SHIP_STATUS,
  RECRUITER_TRUST_REVIEW_SHIP_STATUS,
} from "../src/lib/seven-day-c2-recruiter";
import { getWorkspaceModuleActivationEntry } from "../src/lib/all-workspace-modules-activation";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = "docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md";
const HANDOFF = "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md";
const INTEGRATION = "docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function founderSmokePass(): boolean {
  try {
    const doc = readRepo(RUNBOOK);
    return /FOUNDER_SMOKE:\s*PASS/i.test(doc) || /Status:\s*\*\*PASS\*\*/i.test(doc);
  } catch {
    return false;
  }
}

test("1 runbook exists with C1 and C2 checklists", () => {
  const doc = readRepo(RUNBOOK);
  assert.match(doc, /Wave C/i);
  assert.match(doc, /C1.*activation|activation.*C1/i);
  assert.match(doc, /talent.pool|trust.review/i);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(doc, /Evidence template/);
  assert.match(doc, /\/recruiter\/talent-pool/);
  assert.match(doc, /\/recruiter\/trust-review-queue/);
});

test("2 handoff + integration docs linked", () => {
  const handoff = readRepo(HANDOFF);
  const integration = readRepo(INTEGRATION);
  assert.match(handoff, /#449/);
  assert.match(handoff, /#450/);
  assert.match(integration, /072_recruiter_talent_pool_trust_review_c2/);
  assert.match(integration, /preflight:founder-smoke-env/);
});

test("3 C1 — not LIVE without founder smoke PASS", () => {
  if (!founderSmokePass()) {
    assert.equal(RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
    assert.equal(RECRUITER_ACTIVATION_SHIP_STATUS, "pilot");
    const entry = getWorkspaceModuleActivationEntry("recruiter_daily_cockpit");
    assert.ok(entry);
    assert.notEqual(entry!.activationStatus, "LIVE");
    assert.equal(entry!.green, false);
  }
});

test("4 C2 — talent pool and trust review not LIVE without PASS", () => {
  if (!founderSmokePass()) {
    assert.equal(RECRUITER_C2_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
    assert.equal(RECRUITER_TALENT_POOL_SHIP_STATUS, "pilot");
    assert.equal(RECRUITER_TRUST_REVIEW_SHIP_STATUS, "pilot");
    const pool = getWorkspaceModuleActivationEntry("talent_pool");
    const queue = getWorkspaceModuleActivationEntry("trust_review_queue");
    assert.ok(pool);
    assert.ok(queue);
    assert.notEqual(pool!.activationStatus, "LIVE");
    assert.notEqual(queue!.activationStatus, "LIVE");
    assert.equal(pool!.green, false);
    assert.equal(queue!.green, false);
  }
});

test("5 canonical stance — Launch NO-GO, Gate F PENDING", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
  const runbook = readRepo(RUNBOOK);
  assert.match(runbook, /Launch NO-GO/);
  assert.match(runbook, /NOT_GATE_F_YES/);
});

test("6 no fake PASS recorded in runbook status", () => {
  const doc = readRepo(RUNBOOK);
  assert.match(doc, /PENDING|no `FOUNDER_SMOKE: PASS`/i);
  assert.doesNotMatch(doc, /^FOUNDER_SMOKE:\s*PASS/im);
  assert.doesNotMatch(doc, /\*\*Status:\*\*\s*\*\*PASS\*\*/i);
});

test("7 npm scripts registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:recruiter-wave-c-founder-smoke-guard/);
  assert.match(pkg, /preflight:founder-smoke-orchestration/);
});
