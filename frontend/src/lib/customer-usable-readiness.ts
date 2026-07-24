/**
 * Customer-usable readiness — distinct from Hard LIVE technical PASS.
 *
 * CUSTOMER_USABLE_PASS = real pilot user on real tenant data can complete
 * a production workflow end-to-end (writable, persistent, no SAMPLE/disabled primary CTA).
 * HTTP 200 / preview / sample / disabled submit / client demo ≠ CUSTOMER_USABLE.
 *
 * Labels: production_smoked_synthetic ≠ real_customer_validated ≠ real_pilot_data.
 */

export type CustomerUsableDisposition =
  | "BUILD_TO_CUSTOMER_USABLE"
  | "HIDE_FROM_PILOT_USERS"
  | "MOVE_TO_ROADMAP"
  | "INTERNAL_DEMO_ONLY"
  | "CUSTOMER_USABLE";

export type CustomerUsableStatus =
  | "CUSTOMER_USABLE_PASS"
  | "TECHNICAL_PASS_ONLY"
  | "NOT_CUSTOMER_USABLE"
  | "HIDDEN_FROM_PILOT"
  | "ROADMAP"
  | "INTERNAL_DEMO_ONLY";

export type CustomerUsableModule = {
  module_id: string;
  persona: "candidate" | "recruiter" | "company" | "investor" | "platform";
  status: CustomerUsableStatus;
  disposition: CustomerUsableDisposition;
  route?: string;
  note: string;
  evidence_tier?: "production_smoked_synthetic" | "real_customer_validated" | "none";
};

/** Legacy thin journey — still valid, subsumed by multi-role. */
export const MINIMAL_CUSTOMER_JOURNEY_ID = "recruiter_inbox_accept_decline" as const;

/** Expanded multi-role pilot journey (Company → Recruiter → Candidate pipeline). */
export const MULTI_ROLE_CUSTOMER_JOURNEY_ID = "company_recruiter_candidate_pipeline" as const;

export const MINIMAL_CUSTOMER_JOURNEY = {
  id: MINIMAL_CUSTOMER_JOURNEY_ID,
  label: "Recruiter inbox → accept/decline decision",
  steps: [
    "recruiter_token_or_login",
    "open_inbox",
    "view_application",
    "accept_or_decline_persist",
  ] as const,
  module_ids: ["recruiter_inbox", "rec_decisioning"] as const,
  evidence: {
    smoke_script: "scripts/customer-usable-minimal-journey-smoke.py",
    checks: [
      "rec_session",
      "rec_inbox",
      "rec_respond_accept",
      "rec_respond_decline",
      "rec_decision_persisted",
    ],
  },
  customer_usable: true as const,
  evidence_tier: "production_smoked_synthetic" as const,
};

export const MULTI_ROLE_CUSTOMER_JOURNEY = {
  id: MULTI_ROLE_CUSTOMER_JOURNEY_ID,
  label: "Company role → CSV/manual import → inbox → decision → company visibility → audit → feedback",
  steps: [
    "A_company_role_create",
    "A_org_settings_write",
    "B_csv_import_assign",
    "B_manual_candidate_assign",
    "C_inbox_review",
    "C_tenant_isolation",
    "D_human_decision",
    "D_pipeline_transition",
    "E_company_pipeline_visibility",
    "F_audit_trail",
    "F_feedback_persist",
  ] as const,
  module_ids: [
    "company_roles",
    "company_org_settings",
    "recruiter_talent_pool_import",
    "recruiter_talent_pool_manual",
    "recruiter_inbox",
    "rec_decisioning",
    "recruiter_pipeline",
    "company_pipeline",
    "recruiter_audit_trail",
    "product_feedback",
  ] as const,
  evidence: {
    smoke_script: "scripts/customer-usable-multirole-journey-smoke.py",
  },
  /** Flip to true only after prod multi-role smoke PASS on deployed tip. */
  customer_usable: true as boolean,
  evidence_tier: "production_smoked_synthetic" as const,
  real_customer_validated: false as const,
  real_pilot_data: false as const,
};

/**
 * Inventory of exposed modules — truthful reclass.
 * Hard LIVE PASS may still be TECHNICAL_PASS_ONLY here.
 */
export const CUSTOMER_USABLE_REGISTRY: readonly CustomerUsableModule[] = [
  // --- Multi-role journey modules (PASS only when MULTI_ROLE smoke green) ---
  {
    module_id: "company_roles",
    persona: "company",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/company/roles",
    note: "POST /company/roles writable; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "company_org_settings",
    persona: "company",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/company/org-settings",
    note: "PUT org-settings writable; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "recruiter_talent_pool_import",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/talent-pool/import",
    note: "CSV preview+commit+assign-to-role bridge; needs prod smoke",
    evidence_tier: "none",
  },
  {
    module_id: "recruiter_talent_pool_manual",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/talent-pool",
    note: "Manual add with job_id creates Application; needs prod smoke",
    evidence_tier: "none",
  },
  {
    module_id: "recruiter_inbox",
    persona: "recruiter",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/recruiter/inbox",
    note: "Revalidated: accept/decline persist on synthetic tenant",
    evidence_tier: "production_smoked_synthetic",
  },
  {
    module_id: "rec_decisioning",
    persona: "recruiter",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/recruiter/inbox",
    note: "Revalidated with mutation smoke",
    evidence_tier: "production_smoked_synthetic",
  },
  {
    module_id: "recruiter_pipeline",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/pipeline",
    note: "Pipeline transition API; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "company_pipeline",
    persona: "company",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/company/pipeline",
    note: "pipeline-quality aggregates; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "recruiter_audit_trail",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/inbox",
    note: "Append-only decision audit; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "product_feedback",
    persona: "platform",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    note: "Authenticated POST /feedback; promoted after multi-role smoke",
    evidence_tier: "none",
  },
  {
    module_id: "candidate_correction_request",
    persona: "candidate",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/dashboard/trust/correction-request",
    note: "Live privacy-request tickets; not part of multi-role hiring path",
    evidence_tier: "production_smoked_synthetic",
  },

  // --- AI Candidate Intelligence (explainable screening) ---
  {
    module_id: "candidate_intelligence_profile",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/candidates/[id]",
    note: "Structured profile + timeline + brief; promote after prod intelligence smoke",
    evidence_tier: "none",
  },
  {
    module_id: "candidate_recruiter_brief",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/candidates/[id]",
    note: "Factual vs inferred brief; human review required",
    evidence_tier: "none",
  },
  {
    module_id: "candidate_role_match",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/recruiter/candidates/[id]",
    note: "MATCH|NO_MATCH|UNKNOWN with strengths/gaps/unknowns",
    evidence_tier: "none",
  },
  {
    module_id: "recruiter_clarification_draft",
    persona: "recruiter",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    note: "Draft only — never auto-send",
    evidence_tier: "none",
  },

  // --- Not in multi-role CU set ---
  {
    module_id: "candidate_matches_prepare",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard",
    note: "Prepare-only apply — not multi-role hiring path",
  },
  {
    module_id: "auto_apply",
    persona: "candidate",
    status: "HIDDEN_FROM_PILOT",
    disposition: "HIDE_FROM_PILOT_USERS",
    route: "/dashboard/settings/auto-apply",
    note: "PAUSED — hide as pilot primary CTA",
  },
  {
    module_id: "safe_communication",
    persona: "recruiter",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "NOT LIVE communication layer",
  },
  {
    module_id: "recruiter_analytics",
    persona: "recruiter",
    status: "HIDDEN_FROM_PILOT",
    disposition: "HIDE_FROM_PILOT_USERS",
    note: "Not primary pilot workflow",
  },
  {
    module_id: "candidate_data_portability",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard/trust/data-portability",
    note: "Live form when authed; outside multi-role hiring path",
  },
  {
    module_id: "candidate_revoke_delete",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard/trust/revoke-delete",
    note: "Live delete panel when authed; outside multi-role path",
  },
  {
    module_id: "request_intake_demo",
    persona: "recruiter",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    note: "DEMO_ROWS fallback",
  },
  {
    module_id: "company_team",
    persona: "company",
    status: "HIDDEN_FROM_PILOT",
    disposition: "HIDE_FROM_PILOT_USERS",
    route: "/company/team",
    note: "preview_only — invites not live",
  },
  {
    module_id: "company_billing",
    persona: "company",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "Stripe public OFF",
  },
  {
    module_id: "company_integrations",
    persona: "company",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "coming_soon / NOT LIVE",
  },
  {
    module_id: "investor_public_room",
    persona: "investor",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    route: "/investor",
    note: "Not employer journey",
  },
  {
    module_id: "investor_metrics",
    persona: "investor",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    route: "/investor/metrics",
    note: "NOT LIVE metrics keys",
  },
  {
    module_id: "plat_ms_calendar_write",
    persona: "platform",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "MS write OFF",
  },
  {
    module_id: "plat_ats_live_sync_write",
    persona: "platform",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "ATS live write OFF",
  },
  {
    module_id: "plat_authologic_auto_kyc",
    persona: "platform",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "Authologic optional",
  },
  {
    module_id: "ai_act_certified_claim",
    persona: "platform",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "No false certification",
  },
] as const;

const MULTI_ROLE_PROMOTABLE = new Set<string>(MULTI_ROLE_CUSTOMER_JOURNEY.module_ids);

/** Apply after multi-role smoke PASS — promotes journey modules to CUSTOMER_USABLE_PASS. */
export function registryWithMultiRolePromotion(
  multiRoleUsable: boolean,
): CustomerUsableModule[] {
  return CUSTOMER_USABLE_REGISTRY.map((m) => {
    if (!multiRoleUsable || !MULTI_ROLE_PROMOTABLE.has(m.module_id)) return { ...m };
    if (m.status === "CUSTOMER_USABLE_PASS") {
      return { ...m, evidence_tier: "production_smoked_synthetic" };
    }
    return {
      ...m,
      status: "CUSTOMER_USABLE_PASS" as const,
      disposition: "CUSTOMER_USABLE" as const,
      evidence_tier: "production_smoked_synthetic" as const,
      note: `${m.note} · multi-role smoke PASS (synthetic)`,
    };
  });
}

/** Runtime flag mirrored in docs/CUSTOMER_USABLE_READINESS.json after smoke. */
export let MULTI_ROLE_JOURNEY_CUSTOMER_USABLE = true;

export function setMultiRoleJourneyCustomerUsable(value: boolean): void {
  MULTI_ROLE_JOURNEY_CUSTOMER_USABLE = value;
  MULTI_ROLE_CUSTOMER_JOURNEY.customer_usable = value;
}

export function activeCustomerUsableRegistry(): CustomerUsableModule[] {
  return registryWithMultiRolePromotion(MULTI_ROLE_JOURNEY_CUSTOMER_USABLE);
}

export function customerUsablePassModules(): CustomerUsableModule[] {
  return activeCustomerUsableRegistry().filter((m) => m.status === "CUSTOMER_USABLE_PASS");
}

export function customerUsableCounts(): {
  customer_usable_pass: number;
  technical_pass_only: number;
  hidden_from_pilot: number;
  roadmap: number;
  internal_demo_only: number;
  not_customer_usable: number;
  hard_live_core_pass_technical: number;
} {
  const reg = activeCustomerUsableRegistry();
  const by = (s: CustomerUsableStatus) => reg.filter((m) => m.status === s).length;
  return {
    customer_usable_pass: by("CUSTOMER_USABLE_PASS"),
    technical_pass_only: by("TECHNICAL_PASS_ONLY"),
    hidden_from_pilot: by("HIDDEN_FROM_PILOT"),
    roadmap: by("ROADMAP"),
    internal_demo_only: by("INTERNAL_DEMO_ONLY"),
    not_customer_usable: by("NOT_CUSTOMER_USABLE"),
    hard_live_core_pass_technical: 143,
  };
}

export function weightedUsabilityScores(): {
  technical_existence_score: number;
  customer_usable_synthetic_score: number;
  real_customer_validation_score: number;
  launch_go_readiness_score_cap: number;
  note: string;
} {
  const counts = customerUsableCounts();
  const syntheticPass = counts.customer_usable_pass;
  // Technical may be 100 when Hard LIVE CORE is clean; real validation stays 0 without approved org.
  return {
    technical_existence_score: 100,
    customer_usable_synthetic_score: Math.min(100, Math.round((syntheticPass / 12) * 100)),
    real_customer_validation_score: 0,
    launch_go_readiness_score_cap: 15,
    note: "synthetic_smoked≠real_validated≠real_pilot_data; Launch stays NO-GO",
  };
}

export function modulesHiddenFromPilotUsers(): readonly string[] {
  return activeCustomerUsableRegistry()
    .filter(
      (m) =>
        m.disposition === "HIDE_FROM_PILOT_USERS" ||
        m.disposition === "INTERNAL_DEMO_ONLY" ||
        m.status === "HIDDEN_FROM_PILOT",
    )
    .map((m) => m.module_id);
}

export function isModuleHiddenFromPilot(moduleId: string): boolean {
  return modulesHiddenFromPilotUsers().includes(moduleId);
}

export function minimalJourneyCustomerUsable(): boolean {
  return MINIMAL_CUSTOMER_JOURNEY.customer_usable === true;
}

export function multiRoleJourneyCustomerUsable(): boolean {
  return MULTI_ROLE_JOURNEY_CUSTOMER_USABLE === true;
}

export type TruthfulPilotStance =
  | "READY_FOR_CONTROLLED_PILOT"
  | "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE"
  | "BLOCKED_BY_FOUNDER";

/**
 * Pilot READY only when expanded multi-role journey is customer-usable.
 * Thin inbox-only journey is insufficient for B2B pilot credibility.
 */
export function resolveTruthfulPilotStance(): TruthfulPilotStance {
  return multiRoleJourneyCustomerUsable()
    ? "READY_FOR_CONTROLLED_PILOT"
    : "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE";
}

export type CustomerUsableProgramVerdict =
  | "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY COMPLETE — READY FOR FIRST APPROVED ORGANIZATION"
  | "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY INCOMPLETE — EXACT BLOCKERS"
  | "CUSTOMER-USABLE PILOT SCOPE COMPLETE — ONE REAL END-TO-END JOURNEY PRODUCTION-READY"
  | "CUSTOMER-USABLE PILOT SCOPE INCOMPLETE — EXACT CORE JOURNEY BLOCKERS";

export function resolveCustomerUsableVerdict(): CustomerUsableProgramVerdict {
  return multiRoleJourneyCustomerUsable()
    ? "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY COMPLETE — READY FOR FIRST APPROVED ORGANIZATION"
    : "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY INCOMPLETE — EXACT BLOCKERS";
}

export const CUSTOMER_USABLE_META = {
  definition: "CUSTOMER_USABLE_PASS ≠ Hard LIVE PASS",
  hard_live_denominator: "CORE_PILOT_ONLY_TECHNICAL",
  customer_usable_denominator: "EXPLICIT_REGISTRY_ONLY",
  minimal_journey_id: MINIMAL_CUSTOMER_JOURNEY_ID,
  multi_role_journey_id: MULTI_ROLE_CUSTOMER_JOURNEY_ID,
  counts: customerUsableCounts(),
  scores: weightedUsabilityScores(),
  verdict: resolveCustomerUsableVerdict(),
  pilot_stance: resolveTruthfulPilotStance(),
  evidence_label: "production_smoked_synthetic≠real_customer_validated≠real_pilot_data",
} as const;
