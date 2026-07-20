/**
 * Hard LIVE evidence registry CI guard — no PASS without criterion 25 + smoke_sha; stance frozen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  HARD_LIVE_REGISTRY_META,
  assertNoLivePassWithoutSmoke,
  registryModuleIds,
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
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 6);
  for (const row of passed) {
    assert.ok(!row.missing_criteria.includes(25), row.module_id);
    assert.ok(row.smoke_sha, row.module_id);
    assert.equal(row.blocker, null, row.module_id);
  }
});

test("wave1 trust modules present and held policy modules blocked", () => {
  const ids = new Set(registryModuleIds());
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
  assert.ok(held.every((r) => r.blocker));
});

test("docs registry JSON mirrors TS module ids and PASS smoke fields", () => {
  const jsonPath = join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json");
  const raw = readFileSync(jsonPath, "utf8");
  const doc = JSON.parse(raw) as {
    modules: Array<{ module_id: string; status: string; smoke_sha?: string }>;
    stance: { pilot: string; external_pilot_enrollment_enabled: boolean };
  };
  assert.equal(doc.modules.length, HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.length);
  const docIds = new Set(doc.modules.map((m) => m.module_id));
  for (const id of registryModuleIds()) {
    assert.ok(docIds.has(id), id);
  }
  assert.equal(doc.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(doc.stance.external_pilot_enrollment_enabled, false);
  const passDocs = doc.modules.filter((m) => m.status === "PASS");
  assert.equal(passDocs.length, 6);
  for (const m of passDocs) {
    assert.ok(m.smoke_sha, m.module_id);
  }
  assert.match(raw, /PENDING_SMOKE/);
  assert.match(raw, /HELD_POLICY/);
});

test("production action gates still block enrollment", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /BLOCKED_BY_FOUNDER/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});
