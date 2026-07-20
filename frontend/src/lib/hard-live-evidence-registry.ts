/**
 * Machine-readable Hard LIVE 30 evidence registry — Wave 1 Candidate.
 * LIVE badges in capability map / activation require status=PASS after authenticated prod smoke.
 * Stance: Pilot BLOCKED_BY_FOUNDER · Gate F PENDING · Launch NO-GO.
 */
export type HardLiveCriterionResult = "PASS" | "FAIL" | "N/A" | "PENDING";

export type HardLiveModuleEvidence = {
  module_id: string;
  persona: "candidate";
  wave: "1";
  /** Never claim product LIVE until PASS + docs update post-smoke. */
  status: "PENDING_SMOKE" | "PASS" | "FAIL" | "PARTIAL" | "HELD_POLICY";
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

const SMOKE_SHA = "cf773744c92c7ccfae408175b27c30f498d5361f";
const SMOKE_AT = "2026-07-20T20:25:00Z";

function passModule(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  const criteria: Record<string, HardLiveCriterionResult> = {
    ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
  };
  return {
    module_id,
    persona: "candidate",
    wave: "1",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria,
    notes,
    smoke_sha: SMOKE_SHA,
    smoke_at: SMOKE_AT,
  };
}

function heldModule(
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

/** Canonical Wave 1 registry — CI guards assert no PASS without smoke evidence fields. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE1: HardLiveModuleEvidence[] = [
  passModule(
    "candidate_consent_receipt",
    "/dashboard/trust/consent-receipt",
    "candidate-squad",
    "Auth prod smoke PASS — live consents/receipts via trust live-bundle on aligned SHA.",
  ),
  passModule(
    "candidate_control_center",
    "/dashboard/trust/controls",
    "candidate-squad",
    "Auth prod smoke PASS — live trust bundle aggregate + privacy APIs.",
  ),
  passModule(
    "candidate_correction_request",
    "/dashboard/trust/corrections",
    "candidate-squad",
    "Auth prod smoke PASS — idempotent POST privacy-requests correction + cancel cleanup.",
  ),
  passModule(
    "candidate_data_portability",
    "/dashboard/trust/portability",
    "candidate-squad",
    "Auth prod smoke PASS — privacy portability path on same live trust surface.",
  ),
  passModule(
    "candidate_export_preview",
    "/dashboard/trust/export-preview",
    "candidate-squad",
    "Module smoke PASS — self-serve export.json + export intake + ops queue (non-fulfillment).",
  ),
  passModule(
    "candidate_identity_verification",
    "/dashboard/trust/identity-verification",
    "candidate-squad",
    "Module smoke PASS — manual identity review status + KYC read; Authologic start stays HELD.",
  ),
  passModule(
    "candidate_trust_audit_export",
    "/dashboard/trust/audit-export",
    "candidate-squad",
    "Auth prod smoke PASS — audit events in live-bundle + download path.",
  ),
  passModule(
    "candidate_trust_overview",
    "/dashboard/trust/overview",
    "candidate-squad",
    "Auth prod smoke PASS — live trust center aggregate overview.",
  ),
  passModule(
    "cand_notifications",
    "/dashboard/trust/controls",
    "candidate-squad",
    "Module smoke PASS — PATCH notification-preferences toggle + restore.",
  ),
  passModule(
    "cand_preferences",
    "/dashboard/trust/visibility-preferences",
    "candidate-squad",
    "Module smoke PASS — visibility preferences POST/PATCH persistence.",
  ),
  heldModule(
    "cand_cv_import",
    "/dashboard/cv",
    "candidate-squad",
    "PROFILE_EDIT_REQUIRES_STANDARD",
    "CV upload gated by PROFILE_EDIT → Standard+; Stripe public not LIVE — policy hold.",
  ),
  heldModule(
    "cand_cv_parsing",
    "/dashboard/cv",
    "candidate-squad",
    "PROFILE_EDIT_REQUIRES_STANDARD",
    "CV parse path shares PROFILE_EDIT Standard+ gate — policy hold with Stripe/plan.",
  ),
  passModule(
    "cand_feedback",
    "/dashboard/matches",
    "candidate-squad",
    "Module smoke PASS — match-feedback list/POST (or empty matches read path).",
  ),
  passModule(
    "cand_match_explanation",
    "/dashboard/matches",
    "candidate-squad",
    "Module smoke PASS — matches API exposes score/match_reason schema fields.",
  ),
  heldModule("auto_apply", "/dashboard#auto-apply-readiness", "ops", "AUTO_APPLY_PAUSED", "Hard ban — do not LIVE."),
  heldModule(
    "cand_ms_calendar",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "MS write blocked; Google path remains approved LIVE separately.",
  ),
  heldModule(
    "plat_identity_kyc",
    "/kyc",
    "candidate-squad",
    "AUTHOLOGIC_CONFIG_DEPENDENT",
    "Provider KYC not claimed LIVE without configured Authologic + smoke.",
  ),
  heldModule("candidate_plan", "/dashboard/plan", "candidate-squad", "STRIPE_NOT_PUBLIC", "Stripe public not LIVE."),
  heldModule("plan_payments", "/dashboard/billing", "candidate-squad", "STRIPE_NOT_PUBLIC", "Stripe public not LIVE."),
  heldModule(
    "cand_account_deletion",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "INTERNAL_DSR_PATH",
    "Deletion remains INTERNAL_ONLY until Wave 6 DSR completion.",
  ),
  heldModule(
    "candidate_revoke_delete",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "INTERNAL_MODULE",
    "Hub-hidden INTERNAL — not external LIVE.",
  ),
];

export const HARD_LIVE_REGISTRY_META = {
  definition: "docs/HARD_LIVE_DEFINITION_30.md",
  wave: "1",
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
    script: "frontend/scripts/wave1-candidate-module-prod-smoke.test.ts",
    sha: SMOKE_SHA,
    at: SMOKE_AT,
    write: true,
    exclude_from_product_metrics: true,
  },
} as const;

export function assertNoLivePassWithoutSmoke(registry = HARD_LIVE_EVIDENCE_REGISTRY_WAVE1): void {
  for (const row of registry) {
    if (row.status === "PASS") {
      if (row.missing_criteria.includes(25)) {
        throw new Error(`Module ${row.module_id} cannot PASS with criterion 25 missing`);
      }
      if (!row.smoke_sha) {
        throw new Error(`Module ${row.module_id} PASS requires smoke_sha`);
      }
    }
  }
}

export function registryModuleIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.map((r) => r.module_id);
}
