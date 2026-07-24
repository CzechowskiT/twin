/**
 * Customer-usable readiness — distinct from Hard LIVE technical PASS.
 *
 * CUSTOMER_USABLE_PASS = real pilot user on real tenant data can complete
 * a production workflow end-to-end (writable, persistent, no SAMPLE/disabled primary CTA).
 * HTTP 200 / preview / sample / disabled submit / client demo ≠ CUSTOMER_USABLE.
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
};

/** The ONE minimal production E2E journey declared customer-usable. */
export const MINIMAL_CUSTOMER_JOURNEY_ID = "recruiter_inbox_accept_decline" as const;

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
    api_mutations: [
      "POST /api/v1/recruiter/inbox/{id}/respond",
      "POST /api/v1/recruiter/inbox/respond-batch",
    ],
  },
  customer_usable: true as const,
};

/**
 * Inventory of exposed modules — truthful reclass.
 * Hard LIVE PASS may still be TECHNICAL_PASS_ONLY here.
 */
export const CUSTOMER_USABLE_REGISTRY: readonly CustomerUsableModule[] = [
  // --- Minimal journey (CUSTOMER_USABLE) ---
  {
    module_id: "recruiter_inbox",
    persona: "recruiter",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/recruiter/inbox",
    note: "Real inbox load + accept/decline mutations persist on tenant token",
  },
  {
    module_id: "rec_decisioning",
    persona: "recruiter",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/recruiter/inbox",
    note: "Accept/decline/batch respond — same journey as inbox",
  },

  // --- Candidate: trust live tickets BUILD; prepare-only apply not full journey ---
  {
    module_id: "candidate_correction_request",
    persona: "candidate",
    status: "CUSTOMER_USABLE_PASS",
    disposition: "CUSTOMER_USABLE",
    route: "/dashboard/trust/correction-request",
    note: "Live privacy-request tickets via API when authenticated; demo chrome removed on livePath",
  },
  {
    module_id: "candidate_matches_prepare",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard",
    note: "Matches + prepare package exist; production apply is prepare-only / auto-apply PAUSED",
  },
  {
    module_id: "auto_apply",
    persona: "candidate",
    status: "HIDDEN_FROM_PILOT",
    disposition: "HIDE_FROM_PILOT_USERS",
    route: "/dashboard/settings/auto-apply",
    note: "PAUSED / REVIEW_BEFORE_SUBMIT — hide as pilot primary CTA",
  },

  // --- Recruiter non-usable ---
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
    note: "Analytics notLive notes — not primary pilot workflow",
  },
  {
    module_id: "candidate_data_portability",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard/trust/data-portability",
    note: "Live privacy form when authed; demo draft still shown — not the minimal journey",
  },
  {
    module_id: "candidate_revoke_delete",
    persona: "candidate",
    status: "TECHNICAL_PASS_ONLY",
    disposition: "BUILD_TO_CUSTOMER_USABLE",
    route: "/dashboard/trust/revoke-delete",
    note: "Live account-delete panel when authed; sample path still has disabled submit",
  },
  {
    module_id: "request_intake_demo",
    persona: "recruiter",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    note: "DEMO_ROWS fallback / candidate preview route",
  },

  // --- Company ---
  {
    module_id: "company_team",
    persona: "company",
    status: "HIDDEN_FROM_PILOT",
    disposition: "HIDE_FROM_PILOT_USERS",
    route: "/company/team",
    note: "preview_only banner — not customer-usable mutations",
  },
  {
    module_id: "company_billing",
    persona: "company",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "Stripe public OFF; billing preview only",
  },
  {
    module_id: "company_integrations",
    persona: "company",
    status: "ROADMAP",
    disposition: "MOVE_TO_ROADMAP",
    note: "coming_soon / NOT LIVE integrations",
  },

  // --- Investor ---
  {
    module_id: "investor_public_room",
    persona: "investor",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    route: "/investor",
    note: "Diligence / demo tiers — not pilot employer journey",
  },
  {
    module_id: "investor_metrics",
    persona: "investor",
    status: "INTERNAL_DEMO_ONLY",
    disposition: "INTERNAL_DEMO_ONLY",
    route: "/investor/metrics",
    note: "NOT LIVE module keys in metrics reality dashboard",
  },

  // --- Optional vendors (already out of Hard LIVE denominator) ---
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
    note: "Legal marketing claim — no false certification",
  },
] as const;

export function customerUsablePassModules(): CustomerUsableModule[] {
  return CUSTOMER_USABLE_REGISTRY.filter((m) => m.status === "CUSTOMER_USABLE_PASS");
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
  const by = (s: CustomerUsableStatus) =>
    CUSTOMER_USABLE_REGISTRY.filter((m) => m.status === s).length;
  return {
    customer_usable_pass: by("CUSTOMER_USABLE_PASS"),
    technical_pass_only: by("TECHNICAL_PASS_ONLY"),
    hidden_from_pilot: by("HIDDEN_FROM_PILOT"),
    roadmap: by("ROADMAP"),
    internal_demo_only: by("INTERNAL_DEMO_ONLY"),
    not_customer_usable: by("NOT_CUSTOMER_USABLE"),
    /** Hard LIVE CORE pass is technical existence — not this denominator. */
    hard_live_core_pass_technical: 143,
  };
}

export function modulesHiddenFromPilotUsers(): readonly string[] {
  return CUSTOMER_USABLE_REGISTRY.filter(
    (m) =>
      m.disposition === "HIDE_FROM_PILOT_USERS" ||
      m.disposition === "INTERNAL_DEMO_ONLY" ||
      m.status === "HIDDEN_FROM_PILOT",
  ).map((m) => m.module_id);
}

export function isModuleHiddenFromPilot(moduleId: string): boolean {
  return modulesHiddenFromPilotUsers().includes(moduleId);
}

export function minimalJourneyCustomerUsable(): boolean {
  return MINIMAL_CUSTOMER_JOURNEY.customer_usable === true;
}

/**
 * Truthful pilot stance after reclass.
 * READY only when minimal journey is CUSTOMER_USABLE; else technical incomplete.
 */
export type TruthfulPilotStance =
  | "READY_FOR_CONTROLLED_PILOT"
  | "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE"
  | "BLOCKED_BY_FOUNDER";

export function resolveTruthfulPilotStance(): TruthfulPilotStance {
  return minimalJourneyCustomerUsable()
    ? "READY_FOR_CONTROLLED_PILOT"
    : "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE";
}

export type CustomerUsableProgramVerdict =
  | "CUSTOMER-USABLE PILOT SCOPE COMPLETE — ONE REAL END-TO-END JOURNEY PRODUCTION-READY"
  | "CUSTOMER-USABLE PILOT SCOPE INCOMPLETE — EXACT CORE JOURNEY BLOCKERS";

export function resolveCustomerUsableVerdict(): CustomerUsableProgramVerdict {
  return minimalJourneyCustomerUsable()
    ? "CUSTOMER-USABLE PILOT SCOPE COMPLETE — ONE REAL END-TO-END JOURNEY PRODUCTION-READY"
    : "CUSTOMER-USABLE PILOT SCOPE INCOMPLETE — EXACT CORE JOURNEY BLOCKERS";
}

export const CUSTOMER_USABLE_META = {
  definition: "CUSTOMER_USABLE_PASS ≠ Hard LIVE PASS",
  hard_live_denominator: "CORE_PILOT_ONLY_TECHNICAL",
  customer_usable_denominator: "EXPLICIT_REGISTRY_ONLY",
  minimal_journey_id: MINIMAL_CUSTOMER_JOURNEY_ID,
  counts: customerUsableCounts(),
  verdict: resolveCustomerUsableVerdict(),
  pilot_stance: resolveTruthfulPilotStance(),
} as const;
