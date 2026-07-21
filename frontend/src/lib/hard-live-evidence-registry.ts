/**
 * Machine-readable Hard LIVE 30 evidence registry — Wave 1 Candidate + Wave 2 Recruiter.
 * LIVE badges in capability map / activation require status=PASS after authenticated prod smoke.
 * Stance: Pilot BLOCKED_BY_FOUNDER · Gate F PENDING · Launch NO-GO.
 */
export type HardLiveCriterionResult = "PASS" | "FAIL" | "N/A" | "PENDING";

export type HardLiveModuleEvidence = {
  module_id: string;
  persona: "candidate" | "recruiter";
  wave: "1" | "2";
  /** Never claim product LIVE until PASS + docs update post-smoke. */
  status: "PENDING_SMOKE" | "PASS" | "FAIL" | "PARTIAL" | "HELD_POLICY" | "DEMO_ONLY";
  route: string;
  owner: string;
  blocker: string | null;
  missing_criteria: number[];
  criteria: Record<string, HardLiveCriterionResult>;
  notes: string;
  smoke_sha?: string;
  smoke_at?: string;
};

const ALL_PENDING: Record<string, HardLiveCriterionResult> = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [String(i + 1), "PENDING" as const]),
);

const WAVE1_SMOKE_SHA = "cf773744c92c7ccfae408175b27c30f498d5361f";
const WAVE1_SMOKE_AT = "2026-07-20T20:25:00Z";

/** Filled after Wave 2 authenticated prod smoke PASS — empty until then. */
export const WAVE2_SMOKE_SHA: string | null = null;
export const WAVE2_SMOKE_AT: string | null = null;

function passModuleW1(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "candidate",
    wave: "1",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
    notes,
    smoke_sha: WAVE1_SMOKE_SHA,
    smoke_at: WAVE1_SMOKE_AT,
  };
}

function heldModuleW1(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "candidate",
    wave: "1",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
  };
}

function pendingModuleW2(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "recruiter",
    wave: "2",
    status: "PENDING_SMOKE",
    route,
    owner,
    blocker: "authenticated_prod_smoke_required",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING, "25": "PENDING" },
    notes,
  };
}

function heldModuleW2(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "recruiter",
    wave: "2",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
  };
}

function demoModuleW2(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "recruiter",
    wave: "2",
    status: "DEMO_ONLY",
    route,
    owner,
    blocker: "DEMO_JOURNEY_ISOLATION",
    missing_criteria: [14, 21, 25],
    criteria: { ...ALL_PENDING, "14": "FAIL", "21": "FAIL" },
    notes,
  };
}

/** Canonical Wave 1 registry — CI guards assert no PASS without smoke evidence fields. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE1: HardLiveModuleEvidence[] = [
  passModuleW1(
    "candidate_consent_receipt",
    "/dashboard/trust/consent-receipt",
    "candidate-squad",
    "Auth prod smoke PASS — live consents/receipts via trust live-bundle on aligned SHA.",
  ),
  passModuleW1(
    "candidate_control_center",
    "/dashboard/trust/controls",
    "candidate-squad",
    "Auth prod smoke PASS — live trust bundle aggregate + privacy APIs.",
  ),
  passModuleW1(
    "candidate_correction_request",
    "/dashboard/trust/corrections",
    "candidate-squad",
    "Auth prod smoke PASS — idempotent POST privacy-requests correction + cancel cleanup.",
  ),
  passModuleW1(
    "candidate_data_portability",
    "/dashboard/trust/portability",
    "candidate-squad",
    "Auth prod smoke PASS — privacy portability path on same live trust surface.",
  ),
  passModuleW1(
    "candidate_export_preview",
    "/dashboard/trust/export-preview",
    "candidate-squad",
    "Module smoke PASS — self-serve export.json + export intake + ops queue (non-fulfillment).",
  ),
  passModuleW1(
    "candidate_identity_verification",
    "/dashboard/trust/identity-verification",
    "candidate-squad",
    "Module smoke PASS — manual identity review status + KYC read; Authologic start stays HELD.",
  ),
  passModuleW1(
    "candidate_trust_audit_export",
    "/dashboard/trust/audit-export",
    "candidate-squad",
    "Auth prod smoke PASS — audit events in live-bundle + download path.",
  ),
  passModuleW1(
    "candidate_trust_overview",
    "/dashboard/trust/overview",
    "candidate-squad",
    "Auth prod smoke PASS — live trust center aggregate overview.",
  ),
  passModuleW1(
    "cand_notifications",
    "/dashboard/trust/controls",
    "candidate-squad",
    "Module smoke PASS — PATCH notification-preferences toggle + restore.",
  ),
  passModuleW1(
    "cand_preferences",
    "/dashboard/trust/visibility-preferences",
    "candidate-squad",
    "Module smoke PASS — visibility preferences POST/PATCH persistence.",
  ),
  heldModuleW1(
    "cand_cv_import",
    "/dashboard/cv",
    "candidate-squad",
    "PROFILE_EDIT_REQUIRES_STANDARD",
    "CV upload gated by PROFILE_EDIT → Standard+; Stripe public not LIVE — policy hold.",
  ),
  heldModuleW1(
    "cand_cv_parsing",
    "/dashboard/cv",
    "candidate-squad",
    "PROFILE_EDIT_REQUIRES_STANDARD",
    "CV parse path shares PROFILE_EDIT Standard+ gate — policy hold with Stripe/plan.",
  ),
  passModuleW1(
    "cand_feedback",
    "/dashboard/matches",
    "candidate-squad",
    "Module smoke PASS — match-feedback list/POST (or empty matches read path).",
  ),
  passModuleW1(
    "cand_match_explanation",
    "/dashboard/matches",
    "candidate-squad",
    "Module smoke PASS — matches API exposes score/match_reason schema fields.",
  ),
  heldModuleW1("auto_apply", "/dashboard#auto-apply-readiness", "ops", "AUTO_APPLY_PAUSED", "Hard ban — do not LIVE."),
  heldModuleW1(
    "cand_ms_calendar",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "MS write blocked; Google path remains approved LIVE separately.",
  ),
  heldModuleW1(
    "plat_identity_kyc",
    "/kyc",
    "candidate-squad",
    "AUTHOLOGIC_CONFIG_DEPENDENT",
    "Provider KYC not claimed LIVE without configured Authologic + smoke.",
  ),
  heldModuleW1("candidate_plan", "/dashboard/plan", "candidate-squad", "STRIPE_NOT_PUBLIC", "Stripe public not LIVE."),
  heldModuleW1("plan_payments", "/dashboard/billing", "candidate-squad", "STRIPE_NOT_PUBLIC", "Stripe public not LIVE."),
  heldModuleW1(
    "cand_account_deletion",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "INTERNAL_DSR_PATH",
    "Deletion remains INTERNAL_ONLY until Wave 6 DSR completion.",
  ),
  heldModuleW1(
    "candidate_revoke_delete",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "INTERNAL_MODULE",
    "Hub-hidden INTERNAL — not external LIVE.",
  ),
];

/** Wave 2 Recruiter — PENDING_SMOKE until authenticated module smoke PASS; then promote PASS + capability map LIVE. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE2: HardLiveModuleEvidence[] = [
  pendingModuleW2("recruiter_talent_radar", "/recruiter/talent-radar", "recruiter-squad", "Await Wave 2 module smoke."),
  pendingModuleW2(
    "recruiter_talent_radar_digest",
    "/recruiter/talent-radar/digest",
    "recruiter-squad",
    "Await Wave 2 module smoke.",
  ),
  pendingModuleW2(
    "recruiter_talent_pool_import",
    "/recruiter/talent-pool/import",
    "recruiter-squad",
    "Await Wave 2 module smoke.",
  ),
  pendingModuleW2("rec_scorecards", "/recruiter/inbox", "recruiter-squad", "Await Wave 2 module smoke."),
  pendingModuleW2("rec_notes", "/recruiter/inbox", "recruiter-squad", "Live decision-memory API — await smoke."),
  pendingModuleW2("rec_matching", "/recruiter/search", "recruiter-squad", "Await Wave 2 module smoke."),
  pendingModuleW2("rec_hiring_funnel_analytics", "/recruiter/analytics", "recruiter-squad", "Await Wave 2 module smoke."),
  pendingModuleW2("recruiter_jobs", "/recruiter/jobs", "recruiter-squad", "Job lifecycle archive — await smoke."),
  pendingModuleW2("recruiter_inbox", "/recruiter/inbox", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("recruiter_pipeline", "/recruiter/pipeline", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("recruiter_search", "/recruiter/search", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("recruiter_talent_pool", "/recruiter/talent-pool", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("recruiter_analytics", "/recruiter/analytics", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2(
    "recruiter_notification_preferences",
    "/recruiter/notification-preferences",
    "recruiter-squad",
    "Regression smoke required.",
  ),
  pendingModuleW2(
    "recruiter_activity_timeline",
    "/recruiter/activity-timeline",
    "recruiter-squad",
    "Regression smoke required.",
  ),
  pendingModuleW2(
    "recruiter_trust_review_queue",
    "/recruiter/trust-review-queue",
    "recruiter-squad",
    "Regression smoke required.",
  ),
  pendingModuleW2("recruiter_saved_views", "/recruiter/inbox", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("rec_decisioning", "/recruiter/inbox", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("rec_shortlist", "/recruiter/inbox", "recruiter-squad", "Regression smoke required."),
  pendingModuleW2("recruiter_daily_cockpit", "/recruiter/daily-cockpit", "recruiter-squad", "Regression smoke required."),
  heldModuleW2(
    "rec_interview_scheduling",
    "/recruiter/calendar",
    "recruiter-squad",
    "RECRUITER_CALENDAR_BLOCKED",
    "Manual schedule exists; provider calendar write BLOCKED.",
  ),
  heldModuleW2(
    "recruiter_calendar",
    "/recruiter/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "MS write blocked; Google recruiter sync not claimed LIVE.",
  ),
  heldModuleW2(
    "recruiter_integrations",
    "/recruiter/integrations",
    "recruiter-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS live-sync hard ban.",
  ),
  heldModuleW2(
    "investor_sor_proof_ats",
    "/recruiter/integrations/ats/import-readiness",
    "recruiter-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS SoR proof stays held with live-sync ban.",
  ),
  heldModuleW2(
    "rec_recruiter_onboarding",
    "/recruiter/inbox",
    "recruiter-squad",
    "EXTERNAL_ENROLLMENT_OFF",
    "Pilot token gated — real enrollment NOT_STARTED.",
  ),
  heldModuleW2("rec_sla_tracking", "/recruiter/analytics", "recruiter-squad", "NOT_BUILT", "SLA product not built."),
  demoModuleW2(
    "rec_candidate_comms",
    "/recruiter/candidates/demo-candidate-001/communication",
    "recruiter-squad",
    "Honest DEMO_ONLY — draft API separate; demo journey never LIVE.",
  ),
  demoModuleW2(
    "rec_collaboration",
    "/recruiter/candidates/demo-candidate-001/collaboration",
    "recruiter-squad",
    "Honest DEMO_ONLY isolation.",
  ),
  demoModuleW2(
    "recruiter_demo_collaboration",
    "/recruiter/candidates/demo-candidate-001/collaboration",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "recruiter_demo_communication",
    "/recruiter/candidates/demo-candidate-001/communication",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "recruiter_demo_decision_memory",
    "/recruiter/candidates/demo-candidate-001/decision-memory",
    "recruiter-squad",
    "Demo journey — live decision-memory is separate API.",
  ),
  demoModuleW2(
    "recruiter_demo_pipeline",
    "/recruiter/jobs/demo-role-001/pipeline",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "recruiter_demo_profile_360",
    "/recruiter/candidates/demo-candidate-001",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "recruiter_demo_team",
    "/recruiter/candidates/demo-candidate-001/team",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "recruiter_demo_trust",
    "/recruiter/candidates/demo-candidate-001/trust",
    "recruiter-squad",
    "Demo journey — DEMO_ONLY.",
  ),
  demoModuleW2(
    "investor_sor_proof_collaboration",
    "/recruiter/candidates/demo-candidate-001/collaboration",
    "recruiter-squad",
    "SoR demo — DEMO_ONLY.",
  ),
  demoModuleW2(
    "investor_sor_proof_pipeline",
    "/recruiter/jobs/demo-role-001/pipeline",
    "recruiter-squad",
    "SoR demo — DEMO_ONLY.",
  ),
];

export const HARD_LIVE_EVIDENCE_REGISTRY: HardLiveModuleEvidence[] = [
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE2,
];

export const HARD_LIVE_REGISTRY_META = {
  definition: "docs/HARD_LIVE_DEFINITION_30.md",
  wave: "2",
  stance: {
    pilot: "BLOCKED_BY_FOUNDER",
    gate_f: "PENDING",
    launch: "NO-GO",
    pmf: "INSUFFICIENT_DATA",
    enrollment: "NOT_STARTED",
    external_pilot_enrollment_enabled: false,
  },
  live_badge_rule: "PASS status + authenticated prod smoke on aligned SHA required before capability map LIVE",
  smoke_evidence: {
    wave1_script: "frontend/scripts/wave1-candidate-module-prod-smoke.test.ts",
    wave1_sha: WAVE1_SMOKE_SHA,
    wave1_at: WAVE1_SMOKE_AT,
    wave2_script: "frontend/scripts/wave2-recruiter-module-prod-smoke.test.ts",
    wave2_sha: WAVE2_SMOKE_SHA,
    wave2_at: WAVE2_SMOKE_AT,
    write: true,
    exclude_from_product_metrics: true,
  },
} as const;

export function assertNoLivePassWithoutSmoke(
  registry: HardLiveModuleEvidence[] = HARD_LIVE_EVIDENCE_REGISTRY,
): void {
  for (const row of registry) {
    if (row.status === "PASS") {
      if (row.missing_criteria.includes(25)) {
        throw new Error(`Module ${row.module_id} cannot PASS with criterion 25 missing`);
      }
      if (!row.smoke_sha) {
        throw new Error(`Module ${row.module_id} PASS requires smoke_sha`);
      }
    }
    if (row.status === "DEMO_ONLY" && row.persona === "recruiter") {
      if (!row.blocker) {
        throw new Error(`Demo module ${row.module_id} requires blocker`);
      }
    }
  }
}

export function registryModuleIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY.map((r) => r.module_id);
}

export function wave2PendingSmokeIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE2.filter((r) => r.status === "PENDING_SMOKE").map((r) => r.module_id);
}
