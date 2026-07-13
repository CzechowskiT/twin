/**
 * Founder smoke guard — Wave B B1/B2/B3 stay PILOT until documented browser PASS.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getWorkspaceModuleActivationEntry } from "../src/lib/all-workspace-modules-activation";
import {
  CAREER_COMPASS_BROWSER_SMOKE_STATUS,
  CAREER_COMPASS_SHIP_STATUS,
  REFERRALS_BROWSER_SMOKE_STATUS,
  REFERRALS_SHIP_STATUS,
  TRUST_CENTER_BROWSER_SMOKE_STATUS,
  TRUST_CENTER_SHIP_STATUS,
} from "../src/lib/seven-day-d2-candidate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FOUNDER_SMOKE_DOC = "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md";
const MIGRATION_073 = "backend/alembic/versions/073_candidate_referrals.py";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function founderSmokePassRecorded(): boolean {
  try {
    const doc = readRepo(FOUNDER_SMOKE_DOC);
    return /^FOUNDER_SMOKE:\s*PASS/im.test(doc) || /\*\*Status:\*\*\s*\*\*PASS\*\*/i.test(doc);
  } catch {
    return false;
  }
}

test("1 founder smoke doc exists", () => {
  const doc = readRepo(FOUNDER_SMOKE_DOC);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Career Compass/i);
  assert.match(doc, /Trust Center/i);
  assert.match(doc, /Referrals/i);
});

test("2 Wave B modules — PILOT until founder smoke PASS", () => {
  if (founderSmokePassRecorded()) return;

  assert.equal(CAREER_COMPASS_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
  assert.equal(TRUST_CENTER_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");
  assert.equal(REFERRALS_BROWSER_SMOKE_STATUS, "NEEDS_FOUNDER_AUTH_SMOKE");

  assert.equal(CAREER_COMPASS_SHIP_STATUS, "pilot");
  assert.equal(TRUST_CENTER_SHIP_STATUS, "pilot");
  assert.equal(REFERRALS_SHIP_STATUS, "pilot");

  const career = getWorkspaceModuleActivationEntry("candidate_career_compass");
  const trust = getWorkspaceModuleActivationEntry("candidate_trust");
  const referrals = getWorkspaceModuleActivationEntry("candidate_referrals");

  assert.ok(career);
  assert.ok(trust);
  assert.ok(referrals);

  assert.equal(career!.activationStatus, "PILOT");
  assert.equal(trust!.activationStatus, "PILOT");
  assert.equal(referrals!.activationStatus, "PILOT");

  assert.equal(career!.green, false);
  assert.equal(trust!.green, false);
  assert.equal(referrals!.green, false);
});

test("3 B3 smoke checklist documented", () => {
  const doc = readRepo(FOUNDER_SMOKE_DOC);
  assert.match(doc, /\/dashboard\/referrals/);
  assert.match(doc, /Referrals smoke checklist \(B3/);
  assert.match(doc, /#448 Vercel preview/);
});

test("4 migration 073 present and chained to 072", () => {
  assert.equal(existsSync(join(repoRoot, MIGRATION_073)), true);
  const migration = readRepo(MIGRATION_073);
  assert.match(migration, /revision:\s*str\s*=\s*["']073_candidate_referrals["']/);
  assert.match(migration, /down_revision:\s*(str\s*=\s*)?["']072_recruiter_talent_pool_trust_review_c2["']/);
});

test("5 npm scripts registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:candidate-green-modules-founder-smoke-guard/);
  assert.match(pkg, /test:all-modules-green-wave-b3-referrals-guard/);
});
