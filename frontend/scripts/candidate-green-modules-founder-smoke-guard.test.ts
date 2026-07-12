/**
 * Founder smoke guard — Wave B modules must stay PILOT until documented PASS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getWorkspaceModuleActivationEntry } from "../src/lib/all-workspace-modules-activation";
import {
  CAREER_COMPASS_BROWSER_SMOKE_STATUS,
  CAREER_COMPASS_SHIP_STATUS,
  TRUST_CENTER_BROWSER_SMOKE_STATUS,
  TRUST_CENTER_SHIP_STATUS,
} from "../src/lib/seven-day-d2-candidate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FOUNDER_SMOKE_DOC = "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md";

function founderSmokeDocPassRecorded(): boolean {
  try {
    const doc = readFileSync(join(repoRoot, FOUNDER_SMOKE_DOC), "utf8");
    return /FOUNDER_SMOKE:\s*PASS/i.test(doc) || /Status:\s*\*\*PASS\*\*/i.test(doc);
  } catch {
    return false;
  }
}

test("1 founder smoke doc — no PASS without file", () => {
  const pass = founderSmokeDocPassRecorded();
  if (!pass) {
    assert.equal(CAREER_COMPASS_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
    assert.equal(TRUST_CENTER_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
  }
});

test("2 career compass — not LIVE without founder smoke PASS", () => {
  if (!founderSmokeDocPassRecorded()) {
    assert.equal(CAREER_COMPASS_SHIP_STATUS, "pilot");
    const entry = getWorkspaceModuleActivationEntry("candidate_career_compass");
    assert.equal(entry!.activationStatus, "PILOT");
    assert.equal(entry!.green, false);
  }
});

test("3 trust center — not LIVE without founder smoke PASS", () => {
  if (!founderSmokeDocPassRecorded()) {
    assert.equal(TRUST_CENTER_SHIP_STATUS, "pilot");
    const trust = getWorkspaceModuleActivationEntry("candidate_trust");
    assert.equal(trust!.activationStatus, "PILOT");
    assert.equal(trust!.green, false);
  }
});

test("4 referrals — stays PILOT when Wave B smoke pending", () => {
  if (!founderSmokeDocPassRecorded()) {
    const referrals = getWorkspaceModuleActivationEntry("candidate_referrals");
    if (referrals) {
      assert.notEqual(referrals.activationStatus, "LIVE");
      assert.equal(referrals.green, false);
    }
  }
});

test("5 npm script registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:candidate-green-modules-founder-smoke-guard/);
});
