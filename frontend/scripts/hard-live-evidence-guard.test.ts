/**
 * Hard LIVE evidence registry CI guard — CORE_PILOT denominator + Founder stance frozen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BLOCKER_ELIMINATION_SMOKE_SHA,
  CONNECTOR_SMOKE_SHA,
  FOUNDER_COMPLETION_SMOKE_SHA,
  GAP_CLOSE_SMOKE_SHA,
  HARD_LIVE_EVIDENCE_REGISTRY,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE2,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE3,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE4,
  HARD_LIVE_EVIDENCE_REGISTRY_WAVE5,
  HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE,
  HARD_LIVE_REGISTRY_META,
  WAVE3_SMOKE_SHA,
  assertNoLivePassWithoutSmoke,
  corePilotRegistryModules,
  hardLiveLaunchReadinessCounts,
  registryModuleIds,
  resolveProductInclusion,
  wave2PendingSmokeIds,
  wave3PendingSmokeIds,
  wave4PendingSmokeIds,
  wave5PendingSmokeIds,
  aiCompliancePendingSmokeIds,
} from "../src/lib/hard-live-evidence-registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const OPTIONAL_RECLASS = [
  "cand_ms_calendar",
  "company_ms_calendar_write",
  "plat_ms_calendar_write",
  "plat_identity_kyc",
  "plat_authologic_auto_kyc",
  "plat_ats_live_sync_write",
  "plat_ats_write_sync",
  "plat_slack_connector",
] as const;

test("stance remains Founder-blocked; Gate F PASS; Launch NO-GO; Enrollment OFF", () => {
  assert.equal(HARD_LIVE_REGISTRY_META.stance.pilot, "BLOCKED_BY_FOUNDER");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.gate_f, "PASS");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.launch, "NO-GO");
  assert.equal(HARD_LIVE_REGISTRY_META.stance.external_pilot_enrollment_enabled, false);
  assert.equal(HARD_LIVE_REGISTRY_META.hard_live_denominator, "CORE_PILOT_ONLY");
});

test("CORE_PILOT denominator: held=0 or only temporary investor secure download", () => {
  const counts = hardLiveLaunchReadinessCounts();
  assert.equal(counts.total_core, corePilotRegistryModules().length);
  assert.equal(counts.pass, 142);
  assert.equal(counts.optional_out, 8);
  assert.equal(counts.legal_out, 1);
  assert.equal(counts.post_pilot, 1);
  assert.equal(counts.blocked, 0);
  // Temporary CORE held until BE secure download (parent TODO)
  const coreHeld = corePilotRegistryModules().filter((r) => r.status === "HELD_POLICY");
  assert.equal(counts.held, coreHeld.length);
  assert.ok(counts.held <= 1, `CORE held must be 0 or 1 temporary, got ${counts.held}`);
  if (counts.held === 1) {
    assert.equal(coreHeld[0]!.module_id, "investor_s3_required_download");
  }
  assert.equal(HARD_LIVE_REGISTRY_META.corePilotPassCount, counts.pass);
  assert.equal(HARD_LIVE_REGISTRY_META.corePilotHeldCount, counts.held);
});

test("no CORE PASS rows with missing criterion 25 or without smoke_sha", () => {
  assert.doesNotThrow(() => assertNoLivePassWithoutSmoke());
  const passed = HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 142);
  for (const row of passed) {
    assert.equal(resolveProductInclusion(row), "CORE_PILOT", row.module_id);
    assert.ok(!row.missing_criteria.includes(25), row.module_id);
    assert.ok(row.smoke_sha, row.module_id);
    assert.equal(row.blocker, null, row.module_id);
  }
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY.filter((r) => r.status === "PENDING_SMOKE").length, 0);
});

test("optional integrations are not Hard LIVE BLOCKED in CORE denominator", () => {
  for (const id of OPTIONAL_RECLASS) {
    const row = HARD_LIVE_EVIDENCE_REGISTRY.find((r) => r.module_id === id);
    assert.ok(row, id);
    assert.equal(row!.status, "OPTIONAL_INTEGRATION_NOT_CONFIGURED", id);
    assert.equal(resolveProductInclusion(row!), "OPTIONAL_INTEGRATION", id);
    assert.ok(row!.blocker, id);
    assert.equal(isCoreBlocked(row!), false, `${id} must not count as CORE blocked`);
  }
  const slack = HARD_LIVE_EVIDENCE_REGISTRY.find((r) => r.module_id === "plat_slack_connector");
  assert.notEqual(slack!.status, "BLOCKED_EXTERNAL_CREDENTIALS");
  assert.equal(hardLiveLaunchReadinessCounts().blocked, 0);
});

test("OPTIONAL modules must not claim PASS as CORE", () => {
  for (const row of HARD_LIVE_EVIDENCE_REGISTRY) {
    const inclusion = resolveProductInclusion(row);
    if (inclusion === "OPTIONAL_INTEGRATION") {
      assert.notEqual(row.status, "PASS", row.module_id);
      assert.equal(row.status, "OPTIONAL_INTEGRATION_NOT_CONFIGURED", row.module_id);
    }
    if (inclusion === "LEGAL_MARKETING_CLAIM") {
      assert.equal(row.status, "LEGAL_MARKETING_CLAIM", row.module_id);
      assert.notEqual(row.status, "PASS");
    }
    if (inclusion === "POST_PILOT") {
      assert.equal(row.status, "POST_PILOT", row.module_id);
      assert.notEqual(row.status, "PASS");
    }
  }
});

function isCoreBlocked(row: (typeof HARD_LIVE_EVIDENCE_REGISTRY)[number]): boolean {
  return (
    resolveProductInclusion(row) === "CORE_PILOT" &&
    row.status === "BLOCKED_EXTERNAL_CREDENTIALS"
  );
}

test("wave1 trust modules present; MS/Authologic reclassed optional", () => {
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
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "cand_ms_calendar")?.status,
    "OPTIONAL_INTEGRATION_NOT_CONFIGURED",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "plat_identity_kyc")?.status,
    "OPTIONAL_INTEGRATION_NOT_CONFIGURED",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "auto_apply")?.status,
    "PASS",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.find((r) => r.module_id === "auto_apply")?.smoke_sha,
    FOUNDER_COMPLETION_SMOKE_SHA,
  );
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
  assert.equal(passed.length, 28);
  const gapCloseW2 = new Set(["rec_sla_tracking", "rec_collaboration", "rec_candidate_comms"]);
  const founderW2 = new Set([
    "rec_interview_scheduling",
    "recruiter_calendar",
    "recruiter_integrations",
    "investor_sor_proof_ats",
    "rec_recruiter_onboarding",
  ]);
  assert.ok(
    passed.every((r) =>
      gapCloseW2.has(r.module_id)
        ? r.smoke_sha === GAP_CLOSE_SMOKE_SHA
        : founderW2.has(r.module_id)
          ? r.smoke_sha === FOUNDER_COMPLETION_SMOKE_SHA
          : r.smoke_sha === "d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55",
    ),
  );
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "HELD_POLICY").length, 0);
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.ok(passed.some((r) => r.module_id === "recruiter_calendar"));
  assert.ok(passed.some((r) => r.module_id === "rec_sla_tracking"));
  assert.ok(passed.some((r) => r.module_id === "rec_collaboration"));
  assert.ok(passed.some((r) => r.module_id === "rec_candidate_comms"));
});

test("wave3 company modules PASS; MS write optional out of denominator", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.length >= 25);
  assert.equal(wave3PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 25);
  const founderW3 = new Set([
    "company_integrations",
    "rec_ats_sync",
    "rec_vacancy_import",
    "company_ats_import_readiness",
    "company_billing_public_claim",
    "company_invite_delivery",
    "rec_company_onboarding",
  ]);
  assert.ok(
    passed.every((r) =>
      founderW3.has(r.module_id)
        ? r.smoke_sha === FOUNDER_COMPLETION_SMOKE_SHA
        : r.module_id === "company_billing" || r.module_id === "rec_subscription"
          ? r.smoke_sha === WAVE3_SMOKE_SHA || r.smoke_sha === GAP_CLOSE_SMOKE_SHA
          : r.smoke_sha === WAVE3_SMOKE_SHA,
    ),
  );
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "HELD_POLICY").length, 0);
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.find((r) => r.module_id === "company_ms_calendar_write")
      ?.status,
    "OPTIONAL_INTEGRATION_NOT_CONFIGURED",
  );
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "DEMO_ONLY").length, 0);
  assert.ok(passed.some((r) => r.module_id === "company_integrations"));
  assert.ok(passed.some((r) => r.module_id === "company_billing"));
  assert.ok(passed.some((r) => r.module_id === "rec_subscription"));
});

test("wave5 integrations PASS; optional MS/ATS/Slack/Authologic reclassed", () => {
  assert.ok(HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.length >= 30);
  assert.equal(wave5PendingSmokeIds().length, 0);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 25);
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
          : ["plat_ms_calendar_busy_read", "plat_stripe_public"].includes(r.module_id)
            ? r.smoke_sha === BLOCKER_ELIMINATION_SMOKE_SHA
            : r.smoke_sha === "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18",
    ),
  );
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "HELD_POLICY").length, 0);
  const optional = HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter(
    (r) => r.status === "OPTIONAL_INTEGRATION_NOT_CONFIGURED",
  );
  assert.equal(optional.length, 5);
  assert.ok(optional.some((r) => r.module_id === "plat_ms_calendar_write"));
  assert.ok(optional.some((r) => r.module_id === "plat_ats_live_sync_write"));
  assert.ok(optional.some((r) => r.module_id === "plat_ats_write_sync"));
  assert.ok(optional.some((r) => r.module_id === "plat_authologic_auto_kyc"));
  assert.ok(optional.some((r) => r.module_id === "plat_slack_connector"));
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "BLOCKED_EXTERNAL_CREDENTIALS")
      .length,
    0,
  );
  assert.ok(passed.some((r) => r.module_id === "plat_zapier_connector"));
  assert.ok(passed.some((r) => r.module_id === "plat_google_calendar_push_webhook"));
  assert.ok(passed.some((r) => r.module_id === "plat_ics_import"));
  assert.equal(HARD_LIVE_REGISTRY_META.wave, "5");
  assert.equal(HARD_LIVE_REGISTRY_META.smoke_evidence.wave5_sha, "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18");
});

test("docs registry JSON mirrors TS module ids, product_inclusion, CORE readiness", () => {
  const jsonPath = join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json");
  const raw = readFileSync(jsonPath, "utf8");
  const doc = JSON.parse(raw) as {
    modules: Array<{
      module_id: string;
      status: string;
      product_inclusion?: string;
      smoke_sha?: string;
      wave?: string;
    }>;
    stance: { pilot: string; gate_f: string; external_pilot_enrollment_enabled: boolean };
    wave: string;
    hard_live_denominator?: string;
    core_pilot_readiness?: { pass: number; held: number; total_core: number; blocked: number };
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
  assert.equal(doc.hard_live_denominator, "CORE_PILOT_ONLY");
  assert.ok(doc.core_pilot_readiness);
  assert.equal(doc.core_pilot_readiness!.pass, 142);
  assert.equal(doc.core_pilot_readiness!.blocked, 0);
  const passDocs = doc.modules.filter((m) => m.status === "PASS");
  assert.equal(passDocs.length, 142);
  for (const m of passDocs) {
    assert.ok(m.smoke_sha, m.module_id);
    assert.equal(m.product_inclusion, "CORE_PILOT", m.module_id);
  }
  assert.match(raw, /OPTIONAL_INTEGRATION_NOT_CONFIGURED/);
  assert.match(raw, /LEGAL_MARKETING_CLAIM/);
  assert.match(raw, /POST_PILOT/);
  assert.match(raw, /product_inclusion/);
  assert.doesNotMatch(raw, /"status": "DEMO_ONLY"/);
  assert.doesNotMatch(raw, /"status": "PENDING_SMOKE"/);
  assert.match(raw, /ai_claim_declared/);
  assert.match(raw, /Founder architecture reclass/);
  assert.match(raw, new RegExp(CONNECTOR_SMOKE_SHA!));
  assert.match(raw, new RegExp(WAVE3_SMOKE_SHA!));
  assert.match(raw, new RegExp(FOUNDER_COMPLETION_SMOKE_SHA!));
});

test("production action gates still block enrollment; Gate F PASS", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /BLOCKED_BY_FOUNDER/);
  assert.match(gates, /GATE_F_STATUS = "PASS"/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});

test("ai compliance: legal claim + post-pilot reclassed; never CORE PASS", () => {
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.length, 33);
  const passedAi = HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.filter((r) => r.status === "PASS");
  assert.equal(passedAi.length, 31);
  assert.equal(aiCompliancePendingSmokeIds().length, 0);
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.find((r) => r.module_id === "ai_act_certified_claim")
      ?.status,
    "LEGAL_MARKETING_CLAIM",
  );
  assert.equal(
    HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.find(
      (r) => r.module_id === "ai_protected_attr_monitoring",
    )?.status,
    "POST_PILOT",
  );
  assert.ok(passedAi.some((r) => r.module_id === "ai_autonomous_employment"));
  assert.ok(passedAi.some((r) => r.module_id === "ai_external_verification"));
  assert.ok(passedAi.some((r) => r.module_id === "ai_wave6_dsr_delete_export"));
});

test("Class D TECH_READY_NO_CLAIM modules never PASS in registry", () => {
  const forbiddenPass = ["ai_act_certified_claim", "ai_protected_attr_monitoring"] as const;
  for (const moduleId of forbiddenPass) {
    const row = HARD_LIVE_EVIDENCE_REGISTRY.find((r) => r.module_id === moduleId);
    assert.ok(row, `missing registry row ${moduleId}`);
    assert.notEqual(row!.status, "PASS", `${moduleId} must not be PASS`);
  }
  const json = readFileSync(join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json"), "utf8");
  const parsed = JSON.parse(json) as {
    modules: Array<{ module_id: string; status: string }>;
  };
  for (const moduleId of forbiddenPass) {
    const row = parsed.modules.find((r) => r.module_id === moduleId);
    assert.ok(row, `missing JSON registry row ${moduleId}`);
    assert.notEqual(row!.status, "PASS", `JSON registry must not mark ${moduleId} PASS`);
  }
});

test("wave4 investor: secure download temporary CORE held", () => {
  assert.equal(HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.length, 15);
  const passed = HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.filter((r) => r.status === "PASS");
  assert.equal(passed.length, 14);
  assert.equal(wave4PendingSmokeIds().length, 0);
  const held = HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.filter((r) => r.status === "HELD_POLICY");
  assert.equal(held.length, 1);
  assert.ok(held.some((r) => r.module_id === "investor_s3_required_download"));
  assert.equal(resolveProductInclusion(held[0]!), "CORE_PILOT");
  assert.match(held[0]!.notes, /provider-neutral|TODO/i);
  assert.ok(passed.some((r) => r.module_id === "investor_self_serve_enrollment"));
  assert.ok(passed.some((r) => r.module_id === "investor_external_attestations"));
  assert.match(HARD_LIVE_REGISTRY_META.wave4_note, /CORE_PILOT_ONLY|architecture reclass/);
});
