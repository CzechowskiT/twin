/**
 * Controlled Pilot OS — stance frozen + no false Launch GO / real-org claims.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("OS manifest exists and freezes Launch NO-GO", () => {
  const path = join(root, "docs/CONTROLLED_PILOT_OS_MANIFEST.json");
  assert.ok(existsSync(path));
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    stance: Record<string, unknown>;
    kpi_default: string;
    verdict_expected_without_approved_org: string;
    synthetic_not_real: string[];
  };
  assert.equal(doc.stance.launch, "NO-GO");
  assert.equal(doc.stance.enrollment, "OFF");
  assert.equal(doc.stance.phase_3b, "BLOCKED");
  assert.equal(doc.stance.pilot, "READY_FOR_CONTROLLED_PILOT");
  assert.equal(doc.kpi_default, "NO_REAL_PILOT_DATA");
  assert.match(doc.verdict_expected_without_approved_org, /AWAITING FIRST FOUNDER-APPROVED/);
  assert.ok(doc.synthetic_not_real.includes("nova-hiring-pl"));
});

test("Launch GO evidence gate defaults NO-GO and forbids shortcuts", () => {
  const path = join(root, "docs/LAUNCH_GO_EVIDENCE_GATE.json");
  assert.ok(existsSync(path));
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    default_decision: string;
    forbidden_shortcuts: string[];
    frozen_axes: Record<string, string>;
  };
  assert.equal(doc.default_decision, "NO-GO");
  assert.equal(doc.frozen_axes.enrollment, "OFF");
  assert.ok(doc.forbidden_shortcuts.includes("synthetic_nova_hiring_pl_as_real_org"));
});

test("production action gates keep Launch NO-GO and enrollment off", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /LAUNCH_STANCE_CANON = "NO-GO"/);
  assert.match(gates, /READY_FOR_CONTROLLED_PILOT/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
  assert.match(gates, /NO_REAL_PILOT_DATA/);
});

test("OS index + org workspace + invitation pack docs present", () => {
  for (const rel of [
    "docs/CONTROLLED_PILOT_OPERATING_SYSTEM.md",
    "docs/PILOT_ORG_SELECTION_WORKSPACE.md",
    "docs/PILOT_INVITATION_PACK_TEMPLATE.md",
    "docs/CONTROLLED_PILOT_LAUNCH_PREP_MATRICES.md",
    "docs/CONTROLLED_PILOT_FIRST_WEEK_PLAYBOOK.md",
    "scripts/controlled-pilot-os-status.py",
  ]) {
    assert.ok(existsSync(join(root, rel)), rel);
  }
});

test("backend alembic 100 + service gate present", () => {
  assert.ok(existsSync(join(root, "backend/alembic/versions/100_controlled_pilot_os.py")));
  const svc = readFileSync(join(root, "backend/app/services/controlled_pilot_os.py"), "utf8");
  assert.match(svc, /FOUNDER_APPROVED/);
  assert.match(svc, /NO_REAL_PILOT_DATA/);
  assert.match(svc, /READY_UNSENT/);
  assert.match(svc, /synthetic_org_cannot_be_founder_approved/);
});
