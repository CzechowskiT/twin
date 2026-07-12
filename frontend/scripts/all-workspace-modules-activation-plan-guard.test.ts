/**
 * All-workspace modules activation plan guard — founder decision 2026-07-10.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ALL_WORKSPACE_MODULE_IDS,
  getWorkspaceModuleActivationStatus,
  getWorkspaceModuleDependencies,
  getWorkspaceModuleNextAction,
  isWorkspaceModuleGreen,
  isWorkspaceModuleVisible,
  WORKSPACE_MODULE_ACTIVATION,
  WORKSPACE_MODULE_ACTIVATION_STATUS,
} from "../src/lib/all-workspace-modules-activation";
import { CANONICAL_STANCE } from "../src/lib/seven-day-d7-final-qa";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const MASTER_PLAN = "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md";

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const VALID_STATUSES = new Set(["LIVE", "PILOT", "PREVIEW", "COMING_SOON", "PAUSED", "INTERNAL"]);
const VALID_EFFORT = new Set(["XS", "S", "M", "L", "XL"]);
const VALID_WAVES = new Set(["A", "B", "C", "D", "E", "F", "G", "H"]);

test("1 activation module exports required API", () => {
  const src = read("src/lib/all-workspace-modules-activation.ts");
  assert.match(src, /ALL_WORKSPACE_MODULE_IDS/);
  assert.match(src, /WORKSPACE_MODULE_ACTIVATION_STATUS/);
  assert.match(src, /getWorkspaceModuleActivationStatus/);
  assert.match(src, /isWorkspaceModuleVisible/);
  assert.match(src, /isWorkspaceModuleGreen/);
  assert.match(src, /getWorkspaceModuleNextAction/);
  assert.match(src, /getWorkspaceModuleDependencies/);
});

test("2 every module has valid activation status and metadata", () => {
  for (const entry of WORKSPACE_MODULE_ACTIVATION) {
    assert.ok(VALID_STATUSES.has(entry.activationStatus), entry.id);
    assert.ok(entry.route.startsWith("/") || entry.route.startsWith("mailto:"), entry.id);
    assert.ok(VALID_EFFORT.has(entry.effort), entry.id);
    assert.ok(VALID_WAVES.has(entry.targetWave), entry.id);
    assert.ok(entry.owner.length > 0, entry.id);
    assert.ok(entry.nextAction.length > 0, entry.id);
    assert.equal(WORKSPACE_MODULE_ACTIVATION_STATUS[entry.id], entry.activationStatus);
  }
  assert.equal(ALL_WORKSPACE_MODULE_IDS.length, WORKSPACE_MODULE_ACTIVATION.length);
});

test("3 LIVE status requires green flag", () => {
  for (const entry of WORKSPACE_MODULE_ACTIVATION) {
    if (entry.activationStatus === "LIVE") {
      assert.ok(entry.green, `${entry.id} marked LIVE but not green`);
      assert.ok(isWorkspaceModuleGreen(entry.id));
    }
  }
});

test("4 career compass first activation slice documented", () => {
  const plan = readRepo(MASTER_PLAN);
  assert.match(plan, /Career Compass/i);
  assert.match(plan, /Wave B/);
  assert.match(plan, /persistence/i);
  const autoApply = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "auto_apply");
  assert.ok(autoApply);
  assert.notEqual(autoApply!.targetWave, "B");
  const career = WORKSPACE_MODULE_ACTIVATION.find((e) => e.id === "candidate_career_compass");
  assert.ok(career);
  assert.equal(career!.targetWave, "B");
  assert.equal(career!.green, false);
  assert.equal(career!.activationStatus, "PILOT");
  assert.match(career!.nextAction, /persistence/i);
});

test("5 excluded from first slice — auto-apply stripe ats ms calendar", () => {
  const plan = readRepo(MASTER_PLAN);
  assert.match(plan, /NOT in first slice|not in first slice|Excluded from Wave B/i);
  assert.ok(!isWorkspaceModuleGreen("auto_apply"));
  assert.equal(getWorkspaceModuleActivationStatus("recruiter_integrations"), "COMING_SOON");
  assert.equal(getWorkspaceModuleActivationStatus("recruiter_calendar"), "PAUSED");
});

test("6 master plan execution waves A through H", () => {
  const plan = readRepo(MASTER_PLAN);
  for (const wave of ["Wave A", "Wave B", "Wave C", "Wave D", "Wave E", "Wave F", "Wave G", "Wave H"]) {
    assert.match(plan, new RegExp(wave, "i"));
  }
});

test("7 canonical stance unchanged", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  const plan = readRepo(MASTER_PLAN);
  assert.match(plan, /Launch NO-GO/);
  assert.match(plan, /Gate F PENDING/);
  assert.doesNotMatch(plan, /Gate F YES/i);
});

test("8 helper functions return sensible defaults", () => {
  assert.ok(typeof getWorkspaceModuleNextAction("candidate_profile") === "string");
  assert.ok(Array.isArray(getWorkspaceModuleDependencies("candidate_career_compass")));
  assert.ok(getWorkspaceModuleDependencies("candidate_career_compass").includes("candidate_profile"));
});

test("9 npm script registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:all-workspace-modules-activation-plan-guard/);
});
