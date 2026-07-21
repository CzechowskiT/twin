/**
 * Hard LIVE evidence registry CI guard — Wave 1+2; no PASS without criterion 25 + smoke_sha; stance frozen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  HARD_LIVE_EVIDENCE_REGISTRY,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE2,
  HARD_LIVE_REGISTRY_META,
  assertNoLivePassWithoutSmoke,
  registryModuleIds,
  wave2PendingSmokeIds,
} from "../src/lib/hard-live-evidence-registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("stance remains Founder-blocked", () => {
  assert.equal(HARD_LIVE_REGISTRY_META.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.gate_f, "PENDING");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.launch, "NO-GO");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.external_pilot_enrollment_enabled, false);
});

test("no PASS rows with missing criterion 25 or without smoke_sha", () => {
  assert.doesNotThrow(() => assertNoLivePassWithoutSmoke());
  const passed = HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 32); // 12 wave1 + 20 wave2
  for (const row of passed) {
    assert.ok(!row.missing_criteria.includes(25), row.module_id);
    assert.ok(row.smoke_sha, row.module_id);
    assert.equal(row.blocker, null, row.module_id);
  }
});

test("wave1 trust modules present and held policy modules blocked", () => {
  const ids = new Set(HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.map((r) => r.module_id));
  for (const id of [
    "candidate_consent_receipt",
    "candidate_control_center",
    "candidate_correction_request",
    "candidate_data_portability",
    "candidate_trust_audit_export",
    "candidate_trust_overview",
  ]) {
    assert.ok(ids.has(id), id);
  }
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.filter((r) => r.status === "HELD_POLICY");
  assert.ok(held.some((r) => r.module_id === "auto_apply"));
  assert.ok(held.some((r) => r.module_id === "cand_ms_calendar"));
  assert.ok(held.some((r) => r.module_id === "cand_cv_import"));
  assert.ok(held.every((r) => r.blocker));
});

test("wave2 recruiter modules PASS after smoke with held/demo isolation", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.length >= 30);
  assert.equal(wave2PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 20);
  assert.ok(passed.every((r) => r.smoke_sha === "d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55"));
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "HELD_POLICY");
  assert.ok(held.some((r) => r.module_id === "recruiter_calendar"));
  assert.ok(held.some((r) => r.module_id === "recruiter_integrations"));
  const demo = HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "DEMO_ONLY");
  assert.ok(demo.some((r) => r.module_id === "recruiter_demo_pipeline"));
  assert.ok(demo.every((r) => r.blocker === "DEMO_JOURNEY_ISOLATION"));
});

test("docs registry JSON mirrors TS module ids and PASS smoke fields", () => {
  const jsonPath = join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json");
  const raw = readFileSync(jsonPath, "utf8");
  const doc = JSON.parse(raw) as {
    modules: Array<{ module_id: string; status: string; smoke_sha?: string; wave?: string }>;
    stance: { pilot: string; external_pilot_enrollment_enabled: boolean };
    wave: string;
  };
  assert.equal(doc.modules.length, HARD_LIVE_EVIDENCE_REGISTRY.length);
  const docIds = new Set(doc.modules.map((m) => m.module_id));
  for (const id of registryModuleIds()) {
    assert.ok(docIds.has(id), id);
  }
  assert.equal(doc.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(doc.stance.external_pilot_enrollment_enabled, false);
  assert.equal(doc.wave, "2");
  const passDocs = doc.modules.filter((m) => m.status === "PASS");
  assert.equal(passDocs.length, 32);
  for (const m of passDocs) {
    assert.ok(m.smoke_sha, m.module_id);
  }
  assert.match(raw, /HELD_POLICY/);
  assert.match(raw, /DEMO_ONLY/);
  assert.doesNotMatch(raw, /PENDING_SMOKE/);
  assert.match(raw, /recruiter_talent_radar/);
});

test("production action gates still block enrollment", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /BLOCKED_BY_FOUNDER/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});
