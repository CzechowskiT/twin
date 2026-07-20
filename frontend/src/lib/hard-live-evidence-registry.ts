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
};

const ALL_PENDING: Record<string, HardLiveCriterionResult> = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [String(i + 1), "PENDING" as const]),
);

function pendingModule(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
  missing: number[] = [25],
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "candidate",
    wave: "1",
    status: "PENDING_SMOKE",
    route,
    owner,
    blocker: "authenticated_prod_smoke_required",
    missing_criteria: missing,
    criteria: { ...ALL_PENDING },
    notes,
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
  pendingModule(
    "candidate_consent_receipt",
    "/dashboard/trust/consent-receipt",
    "candidate-squad",
    "Live consents/receipts API wired; badge stays pending until auth prod smoke.",
  ),
  pendingModule(
    "candidate_control_center",
    "/dashboard/trust/controls",
    "candidate-squad",
    "Aggregates live trust bundle; mutations via privacy/consent APIs.",
  ),
  pendingModule(
    "candidate_correction_request",
    "/dashboard/trust/corrections",
    "candidate-squad",
    "POST /privacy-requests type=correction; manual processing notice honest.",
  ),
  pendingModule(
    "candidate_data_portability",
    "/dashboard/trust/portability",
    "candidate-squad",
    "POST privacy portability + GET export.json; no fake fulfillment.",
  ),
  pendingModule(
    "candidate_export_preview",
    "/dashboard/trust/export-preview",
    "candidate-squad",
    "Live export.json download; preview queue remains non-fulfillment.",
  ),
  pendingModule(
    "candidate_identity_verification",
    "/dashboard/trust/identity-verification",
    "candidate-squad",
    "Honest KYC status workflow — no fake success when Authologic unset.",
    [15, 25],
  ),
  pendingModule(
    "candidate_trust_audit_export",
    "/dashboard/trust/audit-export",
    "candidate-squad",
    "Live audit-events read + client JSON download.",
  ),
  pendingModule(
    "candidate_trust_overview",
    "/dashboard/trust/overview",
    "candidate-squad",
    "Live trust center aggregate overview.",
  ),
  pendingModule(
    "cand_notifications",
    "/dashboard/trust/controls",
    "candidate-squad",
    "PATCH /auth/me/notification-preferences — no outbound in smoke.",
  ),
  pendingModule(
    "cand_preferences",
    "/dashboard/trust/visibility-preferences",
    "candidate-squad",
    "Visibility prefs API without demo-candidate-001 as sole truth.",
  ),
  pendingModule("cand_cv_import", "/dashboard/cv", "candidate-squad", "Upload/parse states honest; no fake success."),
  pendingModule("cand_cv_parsing", "/dashboard/cv", "candidate-squad", "Parser states persisted; quality not claimed perfect."),
  pendingModule("cand_feedback", "/dashboard/matches", "candidate-squad", "Match feedback ownership + idempotent upsert."),
  pendingModule("cand_match_explanation", "/dashboard/matches", "candidate-squad", "Partial explainability — honest PARTIAL until smoke."),
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
} as const;

export function assertNoLivePassWithoutSmoke(registry = HARD_LIVE_EVIDENCE_REGISTRY_WAVE1): void {
  for (const row of registry) {
    if (row.status === "PASS" && row.missing_criteria.includes(25)) {
      throw new Error(`Module ${row.module_id} cannot PASS with criterion 25 missing`);
    }
  }
}

export function registryModuleIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE1.map((r) => r.module_id);
}
