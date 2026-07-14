/**
 * Founder Wave B/C evidence guard — activation metadata matches prod smoke PASS.
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
import { CANDIDATE_ACTIVITY_TIMELINE_BROWSER_SMOKE_STATUS } from "../src/lib/candidate-activity-timeline";
import {
  CAREER_COMPASS_BROWSER_SMOKE_STATUS,
  REFERRALS_BROWSER_SMOKE_STATUS,
  TRUST_CENTER_BROWSER_SMOKE_STATUS,
} from "../src/lib/seven-day-d2-candidate";
import { RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS } from "../src/lib/seven-day-c-recruiter";
import { RECRUITER_C2_BROWSER_SMOKE_STATUS } from "../src/lib/seven-day-c2-recruiter";
import { RECRUITER_C3_BROWSER_SMOKE_STATUS } from "../src/lib/seven-day-c3-recruiter";
import { RECRUITER_C4_BROWSER_SMOKE_STATUS } from "../src/lib/seven-day-c4-recruiter";
import { RECRUITER_C5_BROWSER_SMOKE_STATUS } from "../src/lib/seven-day-c5-recruiter";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";
import { parseSmokeEvidenceFrontmatter, validateSmokeEvidence } from "./lib/smoke-evidence-validator";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE_DOC = "docs/FOUNDER_WAVE_BC_SMOKE_EVIDENCE_2026-07-14.md";
const RECRUITER_RUNBOOK = "docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md";
const CANDIDATE_RUNBOOK = "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md";

const WAVE_BC_GREEN_IDS = [
  "candidate_career_compass",
  "career_compass",
  "candidate_trust",
  "trust_center",
  "candidate_referrals",
  "referrals",
  "daily_cockpit",
  "recruiter_daily_cockpit",
  "talent_pool",
  "recruiter_talent_pool",
  "trust_review_queue",
  "recruiter_trust_review_queue",
  "notification_preferences",
  "recruiter_notification_preferences",
  "recruiter_saved_views",
  "recruiter_activity_timeline",
  "candidate_activity_timeline",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 evidence doc exists with PASS and deploy SHA", () => {
  const doc = readRepo(EVIDENCE_DOC);
  assert.match(doc, /PASS/);
  assert.match(doc, /a5f3f6ea/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /Gate F PENDING/);
});

test("2 evidence doc frontmatter validates", () => {
  const doc = readRepo(EVIDENCE_DOC);
  assert.match(doc, /FOUNDER_SMOKE: PASS/);
  const record = parseSmokeEvidenceFrontmatter(doc);
  assert.ok(record, EVIDENCE_DOC);
  assert.equal(validateSmokeEvidence(record!, { allowPass: true }).length, 0);
});

test("2b runbooks record PASS with deploy SHA", () => {
  for (const path of [RECRUITER_RUNBOOK, CANDIDATE_RUNBOOK]) {
    const doc = readRepo(path);
    assert.match(doc, /FOUNDER_SMOKE: PASS/);
    assert.match(doc, /a5f3f6ea/);
  }
});

test("3 Wave B browser smoke constants PASS", () => {
  assert.equal(CAREER_COMPASS_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(TRUST_CENTER_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(REFERRALS_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(CANDIDATE_ACTIVITY_TIMELINE_BROWSER_SMOKE_STATUS, "PASS");
});

test("4 Wave C browser smoke constants PASS", () => {
  assert.equal(RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(RECRUITER_C2_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(RECRUITER_C3_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(RECRUITER_C4_BROWSER_SMOKE_STATUS, "PASS");
  assert.equal(RECRUITER_C5_BROWSER_SMOKE_STATUS, "PASS");
});

test("5 activation registry — Wave B/C green only after smoke PASS", () => {
  for (const id of WAVE_BC_GREEN_IDS) {
    const entry = getWorkspaceModuleActivationEntry(id);
    assert.ok(entry, id);
    assert.equal(entry!.green, true, `${id} must be green after prod smoke PASS`);
    assert.doesNotMatch(entry!.gapsSummary, /NEEDS_FOUNDER_AUTH_SMOKE/);
  }
});

test("6 no hard-ban activations in registry", () => {
  const banned = ["auto_apply", "plan_payments", "company_billing"];
  for (const id of banned) {
    const entry = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === id);
    if (!entry) continue;
    assert.notEqual(entry.activationStatus, "LIVE");
    assert.equal(entry.green, false);
  }
});

test("7 canonical stance unchanged — NO-GO", () => {
  assert.match(CANONICAL_STANCE, /Launch.?NO.?GO/i);
  assert.match(CANONICAL_STANCE, /Gate.?F.?PENDING/i);
});

test("8 npm script registered", () => {
  const pkg = readRepo("frontend/package.json");
  assert.match(pkg, /test:founder-wave-bc-evidence-guard/);
});
