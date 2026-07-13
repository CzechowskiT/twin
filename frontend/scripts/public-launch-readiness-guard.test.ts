/**
 * Public launch readiness guard — indexes 2026-07-13 audit docs + stance.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const REQUIRED_DOCS = [
  "docs/PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md",
  "docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-07-13.md",
  "docs/PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md",
  "docs/PUBLIC_LAUNCH_READINESS_INDEX_2026-07-13.md",
  "docs/PUBLIC_LAUNCH_9_OF_10_SCORECARD.md",
  "docs/PRELAUNCH_SECURITY_AUDIT_2026-07-13.md",
  "docs/PRELAUNCH_PRIVACY_COMPLIANCE_AUDIT_2026-07-13.md",
  "docs/PRELAUNCH_BACKUP_RESTORE_DR_AUDIT_2026-07-13.md",
  "docs/PUBLIC_LAUNCH_DAY_RUNBOOK_2026-07-13.md",
  "docs/FINAL_RELEASE_TRAIN_REBASE_PLAYBOOK_448_460_2026-07-13.md",
  "docs/FEATURE_FLAG_REGISTRY_2026-07-13.md",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 all 2026-07-13 public launch audit docs exist", () => {
  for (const doc of REQUIRED_DOCS) {
    const content = readRepo(doc);
    assert.ok(content.length > 200, `${doc} must be substantive`);
  }
});

test("2 readiness index links inventory matrix blockers and playbooks", () => {
  const index = readRepo("docs/PUBLIC_LAUNCH_READINESS_INDEX_2026-07-13.md");
  assert.match(index, /PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13/);
  assert.match(index, /PUBLIC_LAUNCH_READINESS_MATRIX_2026-07-13/);
  assert.match(index, /PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13/);
  assert.match(index, /FINAL_RELEASE_TRAIN_REBASE_PLAYBOOK_448_460_2026-07-13/);
  assert.match(index, /PUBLIC_LAUNCH_9_OF_10_SCORECARD/);
});

test("3 blocker register documents LB-001 Gate F and LB-002 credentials", () => {
  const reg = readRepo("docs/PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md");
  assert.match(reg, /LB-001/);
  assert.match(reg, /Gate F/);
  assert.match(reg, /LB-002/);
  assert.match(reg, /DEMO_USER_PASSWORD/);
  assert.match(reg, /LB-101/);
  assert.match(reg, /#452/);
});

test("4 release train playbook documents 074 parent fix 072 to 073", () => {
  const playbook = readRepo("docs/FINAL_RELEASE_TRAIN_REBASE_PLAYBOOK_448_460_2026-07-13.md");
  assert.match(playbook, /072_recruiter_talent_pool_trust_review_c2/);
  assert.match(playbook, /073_candidate_referrals/);
  assert.match(playbook, /077_candidate_activity_timeline/);
});

test("5 feature flag registry bans Stripe LIVE and external notifications", () => {
  const flags = readRepo("docs/FEATURE_FLAG_REGISTRY_2026-07-13.md");
  assert.match(flags, /STRIPE_LIVE/);
  assert.match(flags, /ATS_COMING_SOON_NO_LIVE_SYNC/);
  assert.match(flags, /FORCE_MICROSOFT_CALENDAR_COMING_SOON/);
  assert.match(flags, /Launch NO-GO/);
});

test("6 matrix and inventory agree on canonical stance", () => {
  const matrix = readRepo("docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-07-13.md");
  const inventory = readRepo("docs/PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md");
  for (const doc of [matrix, inventory]) {
    assert.match(doc, /Gate E[\s\S]*PASS/);
    assert.match(doc, /Gate F[\s\S]*PENDING/);
    assert.match(doc, /NO-GO/);
  }
});

test("7 npm script registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /"test:public-launch-readiness-guard":/);
});
