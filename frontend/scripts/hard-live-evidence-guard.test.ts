/**
 * Hard LIVE evidence registry CI guard — gap-close: DEMO_ONLY=0; stance frozen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CONNECTOR_SMOKE_SHA,
  GAP_CLOSE_SMOKE_SHA,
  HARD_LIVE_EVIDENCE_REGISTRY,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE2,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE3,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE4,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE5,
  HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE,
  HARD_LIVE_REGISTRY_META,
  assertNoLivePassWithoutSmoke,
  registryModuleIds,
  wave2PendingSmokeIds,
  wave3PendingSmokeIds,
  wave4PendingSmokeIds,
  wave5PendingSmokeIds,
  aiCompliancePendingSmokeIds,
} from "../src/lib/hard-live-evidence-registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("stance remains Founder-blocked", () => {
  assert.equal(HARD_LIVE_REGISTRY_META.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.gate_f, "PASS");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.launch, "NO-GO");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.external_pilot_enrollment_enabled, false);
});

test("no PASS rows with missing criterion 25 or without smoke_sha", () => {
  assert.doesNotThrow(() => assertNoLivePassWithoutSmoke());
  const passed = HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 122);
  for (const row of passed) {
    assert.ok(!row.missing_criteria.includes(25), row.module_id);
    assert.ok(row.smoke_sha, row.module_id);
    assert.equal(row.blocker, null, row.module_id);
  }
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "PENDING_SMOKE").length, 0);
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
    "cand_account_deletion",
    "candidate_revoke_delete",
  ]) {
    assert.ok(ids.has(id), id);
  }
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.filter((r) => r.status === "HELD_POLICY");
  assert.ok(held.some((r) => r.module_id === "auto_apply"));
  assert.ok(held.some((r) => r.module_id === "cand_ms_calendar"));
  assert.ok(held.every((r) => r.blocker));
  // Gap-close: CV sandbox entitlement LIVE for metrics-excluded accounts (public Stripe stays HELD).
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "cand_cv_import")?.status,
    "PASS",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "cand_cv_parsing")?.status,
    "PASS",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "cand_cv_import")?.smoke_sha,
    GAP_CLOSE_SMOKE_SHA,
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "cand_account_deletion")?.status,
    "PASS",
  );
});

test("wave2 recruiter modules PASS after smoke; demo journeys removed", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.length >= 25);
  assert.equal(wave2PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 23);
  const gapCloseW2 = new Set(["rec_sla_tracking", "rec_collaboration", "rec_candidate_comms"]);
  assert.ok(
    passed.every((r) =>
      gapCloseW2.has(r.module_id)
        ? r.smoke_sha === GAP_CLOSE_SMOKE_SHA
        : r.smoke_sha === "d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55",
    ),
  );
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "HELD_POLICY");
  assert.ok(held.some((r) => r.module_id === "recruiter_calendar"));
  assert.ok(held.some((r) => r.module_id === "recruiter_integrations"));
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.ok(passed.some((r) => r.module_id === "rec_sla_tracking"));
  assert.ok(passed.some((r) => r.module_id === "rec_collaboration"));
  assert.ok(passed.some((r) => r.module_id === "rec_candidate_comms"));
});

test("wave3 company modules PASS after smoke; demo journeys removed", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.length >= 25);
  assert.equal(wave3PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 18);
  assert.ok(passed.every((r) => r.smoke_sha === "e841dffc0db0faabef2ed9e067b2581559752a66"));
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "HELD_POLICY");
  assert.ok(held.some((r) => r.module_id === "company_integrations"));
  assert.ok(held.some((r) => r.module_id === "company_billing_public_claim"));
  assert.ok(held.some((r) => r.module_id === "company_ms_calendar_write"));
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.ok(passed.some((r) => r.module_id === "company_billing"));
  assert.ok(passed.some((r) => r.module_id === "rec_subscription"));
});

test("wave5 integrations modules PASS after smoke with policy holds intact", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.length >= 30);
  assert.equal(wave5PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 23);
  assert.ok(
    passed.every((r) =>
      r.module_id === "plat_ics_import"
        ? r.smoke_sha === GAP_CLOSE_SMOKE_SHA
        : [
            "plat_google_calendar_push_webhook",
            "plat_teams_connector",
            "plat_zapier_connector",
            "plat_cloud_storage_connectors",
          ].includes(r.module_id)
          ? r.smoke_sha === CONNECTOR_SMOKE_SHA
          : r.smoke_sha === "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18",
    ),
  );
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "HELD_POLICY");
  assert.equal(held.length, 6);
  assert.ok(held.some((r) => r.module_id === "plat_ms_calendar_write"));
  assert.ok(held.some((r) => r.module_id === "plat_ats_live_sync_write"));
  assert.ok(held.some((r) => r.module_id === "plat_stripe_public"));
  assert.ok(held.some((r) => r.module_id === "plat_authologic_auto_kyc"));
  const blockedExt = HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter(
    (r) => r.status === "BLOCKED_EXTERNAL_CREDENTIALS",
  );
  assert.equal(blockedExt.length, 1);
  assert.ok(blockedExt.some((r) => r.module_id === "plat_slack_connector"));
  assert.ok(passed.some((r) => r.module_id === "plat_zapier_connector"));
  assert.ok(passed.some((r) => r.module_id === "plat_google_calendar_push_webhook"));
  assert.ok(passed.some((r) => r.module_id === "plat_ics_import"));
  assert.equal(HARD_LIVE_REGISTRY_META.wave, "5");
  assert.equal(HARD_LIVE_REGISTRY_META.smoke_evidence.wave5_sha, "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18");
});

test("docs registry JSON mirrors TS module ids and PASS smoke fields", () => {
  const jsonPath = join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json");
  const raw = readFileSync(jsonPath, "utf8");
  const doc = JSON.parse(raw) as {
    modules: Array<{ module_id: string; status: string; smoke_sha?: string; wave?: string }>;
    stance: { pilot: string; gate_f: string; external_pilot_enrollment_enabled: boolean };
    wave: string;
  };
  assert.equal(doc.modules.length, HARD_LIVE_EVIDENCE_REGISTRY.length);
  const docIds = new Set(doc.modules.map((m) => m.module_id));
  for (const id of registryModuleIds()) {
    assert.ok(docIds.has(id), id);
  }
  assert.equal(doc.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(doc.stance.gate_f, "PASS");
  assert.equal(doc.stance.external_pilot_enrollment_enabled, false);
  assert.equal(doc.wave, "5");
  const passDocs = doc.modules.filter((m) => m.status === "PASS");
  assert.equal(passDocs.length, 122);
  for (const m of passDocs) {
    assert.ok(m.smoke_sha, m.module_id);
  }
  assert.match(raw, /HELD_POLICY/);
  assert.doesNotMatch(raw, /"status": "DEMO_ONLY"/);
  assert.doesNotMatch(raw, /"status": "PENDING_SMOKE"/);
  assert.match(raw, /ai_claim_declared/);
  assert.match(raw, /ai_autonomous_employment/);
  assert.match(raw, /investor_data_room/);
  assert.match(raw, /investor_nda_acceptance/);
  assert.match(raw, /company_org_settings/);
  assert.match(raw, /plat_ics_export/);
  assert.match(raw, /plat_ics_import/);
  assert.match(raw, /plat_ms_calendar_write/);
  assert.match(raw, /rec_sla_tracking/);
  assert.match(raw, /Connector activation 2026-07-23/);
  assert.doesNotMatch(raw, /Wave 4 Investor Complete was not shipped/);
  assert.match(raw, /2987e16804fcd7de19db3930f9b7184e465a1d18/);
  assert.match(raw, /b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18/);
  assert.match(raw, /6317d1569120ed889ef136b250c98ba3bf5b5510/);
});

test("production action gates still block enrollment", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /BLOCKED_BY_FOUNDER/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});

test("ai compliance modules PASS after smoke with policy holds intact", () => {
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.length, 33);
  const passedAi = HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.filter((r) => r.status === "PASS");
  assert.equal(passedAi.length, 29);
  assert.equal(aiCompliancePendingSmokeIds().length, 0);
  const held = HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.filter((r) => r.status === "HELD_POLICY");
  assert.equal(held.length, 4);
  assert.ok(held.some((r) => r.module_id === "ai_autonomous_employment"));
  assert.ok(passedAi.some((r) => r.module_id === "ai_wave6_dsr_delete_export"));
});

test("wave4 investor modules PASS after smoke with policy holds intact", () => {
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.length, 15);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 12);
  assert.equal(wave4PendingSmokeIds().length, 0);
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.filter((r) => r.status === "HELD_POLICY");
  assert.equal(held.length, 3);
  assert.ok(held.some((r) => r.module_id === "investor_self_serve_enrollment"));
  assert.match(HARD_LIVE_REGISTRY_META.wave4_note, /Connector activation 2026-07-23/);
});
