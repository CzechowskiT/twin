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

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = "docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md";

function founderSmokePass(): boolean {
  try {
    const doc = readFileSync(join(repoRoot, RUNBOOK), "utf8");
    return /FOUNDER_SMOKE:\s*PASS/i.test(doc) || /Status:\s*\*\*PASS\*\*/i.test(doc);
  } catch {
    return false;
  }
}

test("1 runbook exists with C1 and C2 checklists", () => {
  const doc = readFileSync(join(repoRoot, RUNBOOK), "utf8");
  assert.match(doc, /Wave C/i);
  assert.match(doc, /C1.*activation|activation.*C1/i);
  assert.match(doc, /talent.pool|trust.review/i);
  assert.match(doc, /NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(doc, /Evidence template/);
});

test("2 C1 — not LIVE without founder smoke PASS", () => {
  if (!founderSmokePass()) {
    assert.equal(RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
    assert.equal(RECRUITER_ACTIVATION_SHIP_STATUS, "pilot");
    const entry = getWorkspaceModuleActivationEntry("recruiter_daily_cockpit");
    assert.ok(entry);
    assert.notEqual(entry!.activationStatus, "LIVE");
    assert.equal(entry!.green, false);
  }
});

test("3 C2 — talent pool and trust review not LIVE without PASS", () => {
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
  }
});

test("4 npm script registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:recruiter-wave-c-founder-smoke-guard/);
});
