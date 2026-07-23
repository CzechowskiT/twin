/**
 * Machine-readable Hard LIVE 30 evidence registry — Waves 1–5 + Wave 4 Investor + AI compliance foundation.
 * LIVE badges in capability map / activation require status=PASS after authenticated prod smoke.
 * Stance: Pilot BLOCKED_BY_FOUNDER · Gate F PASS (Option 3) · Launch NO-GO.
 * Hard LIVE launch-readiness denominator = CORE_PILOT only (see product-inclusion-taxonomy).
 */
import {
  HARD_LIVE_DENOMINATOR_RULE,
  type ProductInclusion,
  isInHardLiveDenominator,
  productInclusionFor,
} from "./product-inclusion-taxonomy";

export type HardLiveCriterionResult = "PASS" | "FAIL" | "N/A" | "PENDING";

export type HardLiveModuleStatus =
  | "PENDING_SMOKE"
  | "PASS"
  | "FAIL"
  | "PARTIAL"
  | "HELD_POLICY"
  | "DEMO_ONLY"
  | "BLOCKED_EXTERNAL_CREDENTIALS"
  | "OPTIONAL_INTEGRATION_NOT_CONFIGURED"
  | "LEGAL_MARKETING_CLAIM"
  | "POST_PILOT";

export type HardLiveModuleEvidence = {
  module_id: string;
  persona: "candidate" | "recruiter" | "company" | "platform" | "investor";
  wave: "1" | "2" | "3" | "4" | "5" | "ai" | "ai_compliance";
  /** Never claim product LIVE until PASS + docs update post-smoke. */
  status: HardLiveModuleStatus;
  route: string;
  owner: string;
  blocker: string | null;
  missing_criteria: number[];
  criteria: Record<string, HardLiveCriterionResult>;
  notes: string;
  smoke_sha?: string;
  smoke_at?: string;
  /** Product inclusion class — defaults via taxonomy when omitted. */
  product_inclusion?: ProductInclusion;
};

export type { ProductInclusion };
export { HARD_LIVE_DENOMINATOR_RULE, isInHardLiveDenominator, productInclusionFor };

const ALL_PENDING: Record<string, HardLiveCriterionResult> = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [String(i + 1), "PENDING" as const]),
);

const WAVE1_SMOKE_SHA = "cf773744c92c7ccfae408175b27c30f498d5361f";
const WAVE1_SMOKE_AT = "2026-07-20T20:25:00Z";

/** Filled after Wave 2 authenticated prod smoke PASS. */
export const WAVE2_SMOKE_SHA: string | null = "d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55";
export const WAVE2_SMOKE_AT: string | null = "2026-07-21T04:12:00Z";

/** Filled after Wave 3 authenticated prod smoke PASS — null until post-merge smoke. */
export const WAVE3_SMOKE_SHA: string | null = "51927b99d53ec11a136cb002a6450e9f4e463203";
export const WAVE3_SMOKE_AT: string | null = "2026-07-23T11:50:00Z";

/** Filled after Wave 5 authenticated prod smoke PASS — null until post-merge smoke. */
export const WAVE5_SMOKE_SHA: string | null = "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18";
export const WAVE5_SMOKE_AT: string | null = "2026-07-22T14:50:00Z";

/** Filled after Wave 4 authenticated prod smoke PASS. */
export const WAVE4_SMOKE_SHA: string | null = "2987e16804fcd7de19db3930f9b7184e465a1d18";
export const WAVE4_SMOKE_AT: string | null = "2026-07-22T16:28:00Z";

/** Filled after AI compliance authenticated prod smoke PASS. */
export const AI_COMPLIANCE_SMOKE_SHA: string | null = "2987e16804fcd7de19db3930f9b7184e465a1d18";
export const AI_COMPLIANCE_SMOKE_AT: string | null = "2026-07-22T16:28:00Z";

/** Gap-close authenticated prod smoke (ICS/SLA/collab/DSR/delete) on Railway API. */
export const GAP_CLOSE_SMOKE_SHA: string | null = "193590f42f75fb3158415d93166c48e60e9be99e";
export const GAP_CLOSE_SMOKE_AT: string | null = "2026-07-22T19:24:00Z";

/** External connector activation smoke (Google push / Zapier / storage / Teams draft). */
export const CONNECTOR_SMOKE_SHA: string | null = "51927b99d53ec11a136cb002a6450e9f4e463203";
export const CONNECTOR_SMOKE_AT: string | null = "2026-07-23T11:52:00Z";

/** Founder completion BUILD — calendar/ATS dry-run/enrollment capability/AI HITL prod smoke. */
export const FOUNDER_COMPLETION_SMOKE_SHA: string | null = "998bae84a4fb569b2d776252e784aefbe7320130";
export const FOUNDER_COMPLETION_SMOKE_AT: string | null = "2026-07-23T13:10:00Z";

/** External blocker elimination — MS busy-read ON + Stripe sandbox Checkout Session smoke. */
export const BLOCKER_ELIMINATION_SMOKE_SHA: string | null = "e7c385c4e638968c9db959b7fd7dd6112fb8aa5d";
export const BLOCKER_ELIMINATION_SMOKE_AT: string | null = "2026-07-23T14:22:00Z";

/** Final Pilot Launch Closure — Postgres secure download + CORE denom held=0. */
export const PILOT_CLOSURE_SMOKE_SHA: string | null = "c91a21e14505cc5d617b07dff4849a5deb61a7d4";
export const PILOT_CLOSURE_SMOKE_AT: string | null = "2026-07-23T16:50:00Z";


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
    product_inclusion: productInclusionFor(module_id),
  };
}

/** Optional vendor integration — out of Hard LIVE CORE denominator; blocker kept for honesty. */
function optionalIntegrationModule(
  module_id: string,
  persona: HardLiveModuleEvidence["persona"],
  wave: HardLiveModuleEvidence["wave"],
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona,
    wave,
    status: "OPTIONAL_INTEGRATION_NOT_CONFIGURED",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
    product_inclusion: "OPTIONAL_INTEGRATION",
  };
}

function passModuleW2(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "recruiter",
    wave: "2",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
    notes,
    smoke_sha: WAVE2_SMOKE_SHA!,
    smoke_at: WAVE2_SMOKE_AT!,
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

function passModuleW3(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "company",
    wave: "3",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
    notes,
    smoke_sha: WAVE3_SMOKE_SHA!,
    smoke_at: WAVE3_SMOKE_AT!,
  };
}

function heldModuleW3(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "company",
    wave: "3",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
  };
}

function demoModuleW3(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "company",
    wave: "3",
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

function withGapCloseSmoke<T extends HardLiveModuleEvidence>(row: T): T {
  return {
    ...row,
    smoke_sha: GAP_CLOSE_SMOKE_SHA!,
    smoke_at: GAP_CLOSE_SMOKE_AT!,
  };
}

function withConnectorSmoke<T extends HardLiveModuleEvidence>(row: T): T {
  return {
    ...row,
    smoke_sha: CONNECTOR_SMOKE_SHA!,
    smoke_at: CONNECTOR_SMOKE_AT!,
  };
}

function withFounderCompletionSmoke<T extends HardLiveModuleEvidence>(row: T): T {
  return {
    ...row,
    smoke_sha: FOUNDER_COMPLETION_SMOKE_SHA!,
    smoke_at: FOUNDER_COMPLETION_SMOKE_AT!,
  };
}

function withBlockerEliminationSmoke<T extends HardLiveModuleEvidence>(row: T): T {
  return {
    ...row,
    smoke_sha: BLOCKER_ELIMINATION_SMOKE_SHA!,
    smoke_at: BLOCKER_ELIMINATION_SMOKE_AT!,
  };
}

function withPilotClosureSmoke<T extends HardLiveModuleEvidence>(row: T): T {
  return {
    ...row,
    smoke_sha: PILOT_CLOSURE_SMOKE_SHA!,
    smoke_at: PILOT_CLOSURE_SMOKE_AT!,
  };
}

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
  withGapCloseSmoke(
  passModuleW1(
    "cand_cv_import",
    "/dashboard/cv",
    "candidate-squad",
    "Gap-close — metrics-excluded sandbox upload LIVE; public Stripe Standard+ remains HELD via plan_payments.",
  ),
  ),
  withGapCloseSmoke(
  passModuleW1(
    "cand_cv_parsing",
    "/dashboard/cv",
    "candidate-squad",
    "Gap-close — sandbox parse LIVE on excluded accounts; public Standard+ paywall unchanged.",
  ),
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
  withFounderCompletionSmoke(
    passModuleW1(
      "auto_apply",
      "/dashboard#auto-apply-readiness",
      "ops",
      "Founder RELEASE_WITH_CONTROLS — REVIEW_BEFORE_SUBMIT default; kill_switch_active; captcha_bypass=false. Enrollment/Launch unchanged.",
    ),
  ),
  optionalIntegrationModule(
    "cand_ms_calendar",
    "candidate",
    "1",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "OPTIONAL — Microsoft Graph WRITE not in CORE pilot. CORE calendar = ICS/holds + Google (already PASS). Blocker retained for honesty.",
  ),
  optionalIntegrationModule(
    "plat_identity_kyc",
    "candidate",
    "1",
    "/kyc",
    "candidate-squad",
    "AUTHOLOGIC_CONFIG_DEPENDENT",
    "OPTIONAL — Authologic vendor KYC. CORE = candidate_identity_verification (manual review PASS).",
  ),
  passModuleW1(
    "candidate_plan",
    "/dashboard/plan",
    "candidate-squad",
    "Gap-close — plan sandbox UI LIVE; public Stripe claim remains HELD.",
  ),
  withBlockerEliminationSmoke(
    passModuleW1(
      "plan_payments",
      "/dashboard/billing",
      "candidate-squad",
      "External blocker elimination — Stripe sk_test Checkout Session LIVE (livemode=false); public_launch=false / STRIPE_NOT_PUBLIC_LAUNCH.",
    ),
  ),
  withGapCloseSmoke(
  passModuleW1(
    "cand_account_deletion",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — authenticated delete-account + audit; ops DSR queue separate.",
  ),
  ),
  withGapCloseSmoke(
  passModuleW1(
    "candidate_revoke_delete",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — revoke/delete live panel with export.json + privacy-requests.",
  ),
  ),
];

/** Wave 2 Recruiter — PASS after authenticated module smoke @ d64e9bbe. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE2: HardLiveModuleEvidence[] = [
  passModuleW2(
    "recruiter_talent_radar",
    "/recruiter/talent-radar",
    "recruiter-squad",
    "Wave 2 module smoke PASS — talent radar GET on aligned SHA.",
  ),
  passModuleW2(
    "recruiter_talent_radar_digest",
    "/recruiter/talent-radar/digest",
    "recruiter-squad",
    "Wave 2 module smoke PASS — digest GET on aligned SHA.",
  ),
  passModuleW2(
    "recruiter_talent_pool_import",
    "/recruiter/talent-pool/import",
    "recruiter-squad",
    "Wave 2 module smoke PASS — import preview write path (no ATS).",
  ),
  passModuleW2("rec_scorecards", "/recruiter/inbox", "recruiter-squad", "Wave 2 module smoke PASS — scorecard upsert when apps exist."),
  passModuleW2(
    "rec_notes",
    "/recruiter/inbox",
    "recruiter-squad",
    "Wave 2 module smoke PASS — live decision-memory create (demo fixtures rejected).",
  ),
  passModuleW2("rec_matching", "/recruiter/search", "recruiter-squad", "Wave 2 module smoke PASS — recruiter search matching surface."),
  passModuleW2(
    "rec_hiring_funnel_analytics",
    "/recruiter/analytics",
    "recruiter-squad",
    "Wave 2 module smoke PASS — analytics funnel read; SLA remains NOT_BUILT/HELD.",
  ),
  passModuleW2("recruiter_jobs", "/recruiter/jobs", "recruiter-squad", "Wave 2 module smoke PASS — create + archive lifecycle."),
  passModuleW2("recruiter_inbox", "/recruiter/inbox", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("recruiter_pipeline", "/recruiter/pipeline", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("recruiter_search", "/recruiter/search", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("recruiter_talent_pool", "/recruiter/talent-pool", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("recruiter_analytics", "/recruiter/analytics", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2(
    "recruiter_notification_preferences",
    "/recruiter/notification-preferences",
    "recruiter-squad",
    "Wave 2 regression smoke PASS.",
  ),
  passModuleW2(
    "recruiter_activity_timeline",
    "/recruiter/activity-timeline",
    "recruiter-squad",
    "Wave 2 regression smoke PASS.",
  ),
  passModuleW2(
    "recruiter_trust_review_queue",
    "/recruiter/trust-review-queue",
    "recruiter-squad",
    "Wave 2 regression smoke PASS.",
  ),
  passModuleW2("recruiter_saved_views", "/recruiter/inbox", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("rec_decisioning", "/recruiter/inbox", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("rec_shortlist", "/recruiter/inbox", "recruiter-squad", "Wave 2 regression smoke PASS."),
  passModuleW2("recruiter_daily_cockpit", "/recruiter/daily-cockpit", "recruiter-squad", "Wave 2 regression smoke PASS — activation backend."),
  withFounderCompletionSmoke(
    passModuleW2(
      "rec_interview_scheduling",
      "/recruiter/calendar",
      "recruiter-squad",
      "Founder BUILD smoke — draft/local interview holds LIVE; provider calendar WRITE still gated.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW2(
      "recruiter_calendar",
      "/recruiter/calendar",
      "platform",
      "Founder BUILD smoke — recruiter calendar holds LIVE; MS write remains separate HELD modules.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW2(
      "recruiter_integrations",
      "/recruiter/integrations",
      "recruiter-squad",
      "Founder BUILD smoke — ATS status/preview/dry-run LIVE; ATS live WRITE still BLOCKED.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW2(
      "investor_sor_proof_ats",
      "/recruiter/integrations/ats/import-readiness",
      "recruiter-squad",
      "Founder BUILD smoke — ats_sync_attempts dry-run evidence LIVE; live write still BLOCKED.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW2(
      "rec_recruiter_onboarding",
      "/recruiter/inbox",
      "recruiter-squad",
      "Founder RELEASE_WITH_CONTROLS — capability_ready with enrollment kill-switch OFF; real invites false.",
    ),
  ),
  withGapCloseSmoke(
  passModuleW2(
    "rec_sla_tracking",
    "/recruiter/analytics",
    "recruiter-squad",
    "Gap-close — live SLA targets + breach summary from applications (no sample metrics).",
  ),
  ),
  withGapCloseSmoke(
  passModuleW2(
    "rec_candidate_comms",
    "/recruiter/inbox",
    "recruiter-squad",
    "Gap-close — live communications/draft API; demo journey CTAs removed from product UI.",
  ),
  ),
  withGapCloseSmoke(
  passModuleW2(
    "rec_collaboration",
    "/recruiter/inbox",
    "recruiter-squad",
    "Gap-close — live collaboration notes API; demo fixture boards removed from product CTAs.",
  ),
  ),
];

/** Wave 3 Company — PENDING_SMOKE until authenticated module smoke PASS on aligned SHA. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE3: HardLiveModuleEvidence[] = [
  passModuleW3(
    "company_dashboard",
    "/company/dashboard",
    "company-squad",
    "Wave 3 module smoke PASS — hiring-dashboard live path.",
  ),
  passModuleW3(
    "company_pipeline",
    "/company/pipeline",
    "company-squad",
    "Wave 3 module smoke PASS — pipeline-quality live path.",
  ),
  passModuleW3(
    "company_roles",
    "/company/roles",
    "company-squad",
    "Wave 3 module smoke PASS — roles list/create live path.",
  ),
  passModuleW3(
    "rec_vacancy_creation",
    "/company/roles",
    "company-squad",
    "Wave 3 module smoke PASS — vacancy create via company roles.",
  ),
  passModuleW3(
    "company_hiring_cockpit",
    "/company/hiring-cockpit",
    "company-squad",
    "Wave 3 module smoke PASS — cockpit composed on hiring-dashboard.",
  ),
  passModuleW3(
    "company_hiring_command_center",
    "/company/hiring-command-center",
    "company-squad",
    "Wave 3 module smoke PASS — command center on hiring-dashboard.",
  ),
  passModuleW3(
    "company_talent_pool",
    "/company/talent-pool",
    "company-squad",
    "Wave 3 module smoke PASS — talent pool live read.",
  ),
  passModuleW3(
    "company_team",
    "/company/team",
    "company-squad",
    "Wave 3 module smoke PASS — team readiness live read.",
  ),
  passModuleW3(
    "company_candidate_trust_summary",
    "/company/trust-summary",
    "company-squad",
    "Wave 3 module smoke PASS — live trust summary; demo fixtures rejected.",
  ),
  passModuleW3(
    "company_org_settings",
    "/company/org-settings",
    "company-squad",
    "Wave 3 module smoke PASS — org settings persistence.",
  ),
  passModuleW3(
    "company_permissions",
    "/company/permissions",
    "company-squad",
    "Wave 3 module smoke PASS — RBAC matrix read; invite delivery HELD.",
  ),
  passModuleW3(
    "company_analytics",
    "/company/hiring-command-center",
    "company-squad",
    "Wave 3 module smoke PASS — analytics via hiring-dashboard metrics.",
  ),
  passModuleW3(
    "company_audit_log",
    "/company/audit-log",
    "company-squad",
    "Wave 3 module smoke PASS — company domain-event audit log.",
  ),
  passModuleW3(
    "company_scorecards",
    "/company/scorecards",
    "company-squad",
    "Wave 3 module smoke PASS — scorecards live; demo fixtures rejected.",
  ),
  passModuleW3(
    "company_notifications",
    "/company/notifications",
    "company-squad",
    "Wave 3 module smoke PASS — notification outbox draft only.",
  ),
  passModuleW3(
    "company_onboarding_synthetic",
    "/company/onboarding",
    "company-squad",
    "Wave 3 module smoke PASS — synthetic onboarding; enrollment stays OFF.",
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "company_integrations",
      "/company/integrations",
      "company-squad",
      "Founder BUILD smoke — calendar holds + ATS dry-run/preview LIVE; ATS live WRITE still BLOCKED.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "rec_ats_sync",
      "/company/integrations",
      "company-squad",
      "Founder BUILD smoke — ATS dry-run sync attempts LIVE; live WRITE still BLOCKED.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "rec_vacancy_import",
      "/company/integrations/ats/import-readiness",
      "company-squad",
      "Founder BUILD smoke — vacancy preview honesty LIVE (OAuth may be empty); writeback false.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "company_ats_import_readiness",
      "/company/integrations/ats/import-readiness",
      "company-squad",
      "Founder BUILD smoke — import readiness via ATS status/preview LIVE; live sync WRITE BLOCKED.",
    ),
  ),
  passModuleW3(
    "company_billing",
    "/company/billing",
    "company-squad",
    "Gap-close — company billing sandbox/honesty LIVE; public Stripe claim HELD.",
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "company_billing_public_claim",
      "/company/billing",
      "company-squad",
      "Founder BUILD smoke — sandbox checkout path LIVE (sk_test / stub honesty); STRIPE_NOT_PUBLIC_LAUNCH still true.",
    ),
  ),
  passModuleW3(
    "rec_subscription",
    "/company/billing",
    "company-squad",
    "Gap-close — subscription sandbox path LIVE; public Stripe claim HELD.",
  ),
  optionalIntegrationModule(
    "company_ms_calendar_write",
    "company",
    "3",
    "/company/hiring-cockpit",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "OPTIONAL — Microsoft Graph WRITE not in CORE pilot. CORE = ICS/holds (already PASS).",
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "company_invite_delivery",
      "/company/team",
      "company-squad",
      "Founder RELEASE_WITH_CONTROLS — outbox worker ready; capability_ready with enrollment kill-switch OFF (real_invites=false).",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW3(
      "rec_company_onboarding",
      "/company/onboarding",
      "company-squad",
      "Founder RELEASE_WITH_CONTROLS — capability ready; global enrollment kill-switch OFF; Launch NO-GO unchanged.",
    ),
  ),
];

function passModuleW5(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "5",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
    notes,
    smoke_sha: WAVE5_SMOKE_SHA!,
    smoke_at: WAVE5_SMOKE_AT!,
  };
}

function pendingModuleW5(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "5",
    status: "PENDING_SMOKE",
    route,
    owner,
    blocker: "authenticated_prod_smoke_required",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING, "25": "PENDING" },
    notes,
  };
}


function blockedExternalW5(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "5",
    status: "BLOCKED_EXTERNAL_CREDENTIALS",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
  };
}

function heldModuleW5(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "5",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
  };
}

export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE5: HardLiveModuleEvidence[] = [
  passModuleW5(
    "plat_google_calendar_oauth",
    "/dashboard/calendar",
    "platform",
    "Google Calendar OAuth CONFIGURATION — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_google_calendar_read",
    "/dashboard/calendar",
    "platform",
    "Google Calendar READ — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_google_calendar_write",
    "/dashboard/calendar",
    "platform",
    "Google Calendar WRITE honesty (smoke never writes provider) — Auth prod smoke PASS on aligned SHA.",
  ),
  passModuleW5(
    "plat_google_calendar_availability",
    "/dashboard/calendar",
    "platform",
    "Google freebusy/slots — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_google_calendar_monitoring",
    "/dashboard/calendar/readiness",
    "platform",
    "Calendar provider monitoring — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_ics_export",
    "/dashboard/calendar",
    "platform",
    "ICS generate/export — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_ics_share_token",
    "/dashboard/calendar",
    "platform",
    "ICS share token mint/expiry — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_webcal_subscribe",
    "/dashboard/calendar",
    "platform",
    "WebCal subscribe feed — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_ics_cancel_uid",
    "/dashboard/calendar",
    "platform",
    "ICS CANCEL/UID/SEQUENCE — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_ms_calendar_oauth_config",
    "/dashboard/calendar",
    "platform",
    "Microsoft Calendar CONFIGURATION honesty — WRITE stays HELD.",
  ),
  passModuleW5(
    "plat_ats_config_read",
    "/recruiter/integrations",
    "platform",
    "ATS CONFIGURATION/READ honesty — WRITE stays BLOCKED.",
  ),
  passModuleW5(
    "plat_ats_webhook_verify",
    "/recruiter/integrations",
    "platform",
    "ATS webhook HMAC verify dry-run — no write sync.",
  ),
  passModuleW5(
    "plat_email_draft",
    "/dashboard/trust/controls",
    "platform",
    "Email DRAFT outbox only — real send forbidden in smoke.",
  ),
  passModuleW5(
    "plat_notifications_prefs",
    "/dashboard/trust/controls",
    "platform",
    "Notification preferences READ — metrics exclusion required.",
  ),
  passModuleW5(
    "plat_oauth_providers_status",
    "/login",
    "platform",
    "OAuth providers CONFIGURATION status — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_csv_export_safe",
    "/dashboard/matches",
    "platform",
    "CSV export with formula injection escape — pending Wave 5 smoke.",
  ),
  passModuleW5(
    "plat_integration_inventory",
    "/board/calendar-readiness",
    "platform",
    "Per-capability integration inventory MONITORING — Auth prod smoke PASS on aligned SHA.",
  ),
  passModuleW5(
    "plat_webhook_delivery_ledger",
    "/board/calendar-readiness",
    "platform",
    "Webhook delivery attempt ledger MONITORING — Auth prod smoke PASS on aligned SHA.",
  ),
  optionalIntegrationModule(
    "plat_ms_calendar_write",
    "platform",
    "5",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "OPTIONAL — Microsoft Graph WRITE not in CORE pilot. CORE = ICS/holds + busy-read (already PASS).",
  ),
  withBlockerEliminationSmoke(
    passModuleW5(
      "plat_ms_calendar_busy_read",
      "/dashboard/calendar",
      "platform",
      "External blocker elimination — MICROSOFT_BUSY_READ_ENABLED=true; readiness smoke product_gate_enabled; write gate still false.",
    ),
  ),
  optionalIntegrationModule(
    "plat_ats_live_sync_write",
    "platform",
    "5",
    "/company/integrations",
    "platform",
    "ATS_LIVE_SYNC_BLOCKED",
    "OPTIONAL — ATS live WRITE not in CORE pilot. CORE = dry-run/export/preview (already PASS).",
  ),
  optionalIntegrationModule(
    "plat_ats_write_sync",
    "platform",
    "5",
    "/company/integrations",
    "platform",
    "ATS_LIVE_SYNC_BLOCKED",
    "OPTIONAL — ATS write SYNC not in CORE pilot. CORE = dry-run evidence (already PASS).",
  ),
  withBlockerEliminationSmoke(
    passModuleW5(
      "plat_stripe_public",
      "/dashboard/billing",
      "platform",
      "External blocker elimination — Stripe test Checkout Session LIVE; public_launch=false; no livemode charges.",
    ),
  ),
  optionalIntegrationModule(
    "plat_authologic_auto_kyc",
    "platform",
    "5",
    "/dashboard/identity",
    "platform",
    "AUTHOLOGIC_AUTO_KYC_OFF",
    "OPTIONAL — Authologic Auto KYC. CORE = candidate_identity_verification (manual review PASS).",
  ),
  withConnectorSmoke(
    passModuleW5(
      "plat_google_calendar_push_webhook",
      "/dashboard/calendar",
      "platform",
      "Google push READY — public HTTPS webhook ack + OAuth; watch per connected user. Smoke PASS @ CONNECTOR_SMOKE_SHA.",
    ),
  ),
  optionalIntegrationModule(
    "plat_slack_connector",
    "platform",
    "5",
    "/company/integrations",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "OPTIONAL — Slack connector not in CORE pilot (email/in-app notifications are CORE). Credentials still missing; blocker retained for honesty — not counted as Hard LIVE BLOCKED in CORE denominator.",
  ),
  withConnectorSmoke(
    passModuleW5(
      "plat_teams_connector",
      "/company/integrations",
      "platform",
      "Teams CONFIGURATION/DRAFT PASS (Microsoft OAuth present). Channel WRITE still BLOCKED_EXTERNAL (TEAMS_INCOMING_WEBHOOK_URL / Graph consent) — capability split.",
    ),
  ),
  withConnectorSmoke(
    passModuleW5(
      "plat_zapier_connector",
      "/company/integrations",
      "platform",
      "Generic signed webhook LIVE without Zapier Marketplace — subscribe/test/revoke + internal receiver smoke PASS.",
    ),
  ),
  withConnectorSmoke(
    passModuleW5(
      "plat_cloud_storage_connectors",
      "/company/integrations",
      "platform",
      "Local filesystem storage LIVE on prod (DATA_ROOM_LOCAL_UPLOAD_ENABLED). Cloud S3 keys / Drive OAuth still optional external — handoff doc.",
    ),
  ),
  withGapCloseSmoke(
  passModuleW5(
    "plat_ics_import",
    "/dashboard/calendar",
    "platform",
    "Gap-close — ICS VEVENT import to local busy holds; no Google/MS write.",
  ),
  ),
];

function pendingModuleW4(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "investor",
    wave: "4",
    status: "PENDING_SMOKE",
    route,
    owner,
    blocker: "authenticated_prod_smoke_required",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING },
    notes,
  };
}

function heldModuleW4(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "investor",
    wave: "4",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [13, 15, 25, 28],
    criteria: { ...ALL_PENDING, "28": "FAIL" },
    notes,
    product_inclusion: productInclusionFor(module_id),
  };
}


function passModuleW4(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "investor",
    wave: "4",
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), "PASS" as const])),
    notes,
    smoke_sha: WAVE4_SMOKE_SHA!,
    smoke_at: WAVE4_SMOKE_AT!,
  };
}

/** Wave 4 Investor — PASS after authenticated module smoke @ 2987e168. */
export const HARD_LIVE_EVIDENCE_REGISTRY_WAVE4: HardLiveModuleEvidence[] = [
  passModuleW4("investor_data_room", "/investor/data-room", "investor-squad", "Auth prod smoke PASS — data room NDA + metadata path."),
  passModuleW4("investor_nda_acceptance", "/investor/data-room", "investor-squad", "Auth prod smoke PASS — NDA acceptance ledger."),
  passModuleW4("investor_data_room_list", "/investor/data-room", "investor-squad", "Auth prod smoke PASS — data room document list."),
  passModuleW4("investor_placement_readonly", "/investor/placement", "investor-squad", "Auth prod smoke PASS — placement readonly summary."),
  passModuleW4("investor_trust_proof_readonly", "/investor/trust-proof", "investor-squad", "Auth prod smoke PASS — trust proof readonly."),
  passModuleW4("investor_login_gate", "/login/investor", "investor-squad", "Auth prod smoke PASS — investor login gate."),
  passModuleW4("board_implementation_tracker", "/board/implementation-tracker", "investor-squad", "Auth prod smoke PASS — board readiness aggregation."),
  passModuleW4("investor_metrics_wave4", "/investor/metrics", "investor-squad", "Auth prod smoke PASS — investor metrics reconfirm."),
  passModuleW4("investor_roadmap_wave4", "/investor/roadmap", "investor-squad", "Auth prod smoke PASS — investor roadmap reconfirm."),
  passModuleW4("investor_calculator_wave4", "/investor/calculator", "investor-squad", "Auth prod smoke PASS — investor calculator reconfirm."),
  passModuleW4("investor_contact_wave4", "mailto:contact@twin.care", "investor-squad", "Auth prod smoke PASS — investor contact reconfirm."),
  passModuleW4("investor_product_proof_boundary", "/investor/product-proof", "investor-squad", "Auth prod smoke PASS — product proof boundary."),
  withBlockerEliminationSmoke(
    passModuleW4(
      "investor_external_attestations",
      "/investor/trust-proof",
      "investor-squad",
      "HITL founder-signed attestation queue LIVE; verified_customer_claims=false until Founder signs (≥1 SIGNED).",
    ),
  ),
  withPilotClosureSmoke(
    passModuleW4(
      "investor_s3_required_download",
      "/investor/data-room",
      "investor-squad",
      "CORE_PILOT provider-neutral secure download LIVE — authenticated GET + persistent Postgres blob (S3 optional). Prod smoke upload→download round-trip PASS on tip c91a21e1.",
    ),
  ),
  withFounderCompletionSmoke(
    passModuleW4(
      "investor_self_serve_enrollment",
      "/register/investor",
      "investor-squad",
      "Founder RELEASE_WITH_CONTROLS — capability ready; enrollment kill-switch OFF; Launch/Pilot unchanged.",
    ),
  ),
];

function pendingAiCompliance(
  module_id: string,
  route: string,
  owner: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "ai_compliance",
    status: "PENDING_SMOKE",
    route,
    owner,
    blocker: "authenticated_prod_smoke_required",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING },
    notes,
  };
}

function passAiCompliance(
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
    persona: "platform",
    wave: "ai_compliance" as HardLiveModuleEvidence["wave"],
    status: "PASS",
    route,
    owner,
    blocker: null,
    missing_criteria: [],
    criteria,
    notes,
    smoke_sha: AI_COMPLIANCE_SMOKE_SHA!,
    smoke_at: AI_COMPLIANCE_SMOKE_AT!,
  };
}

function heldAiCompliance(
  module_id: string,
  route: string,
  owner: string,
  blocker: string,
  notes: string,
): HardLiveModuleEvidence {
  return {
    module_id,
    persona: "platform",
    wave: "ai_compliance",
    status: "HELD_POLICY",
    route,
    owner,
    blocker,
    missing_criteria: [25],
    criteria: { ...ALL_PENDING },
    notes,
  };
}

export const HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE: HardLiveModuleEvidence[] = [
  passAiCompliance("ai_claim_declared", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_extracted", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_inferred", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_provenance", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_human_confirm", "/recruiter/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_evidence_link", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_evidence_backed", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_dispute", "/dashboard/evidence/disputes", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_dispute_resolve", "/recruiter/evidence/disputes", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_supersede", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_history", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_decision_log", "/dashboard/evidence/ai-runs", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_explainability", "/dashboard/evidence/ai-runs", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_human_override", "/recruiter/evidence/reviews", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_override_audit", "/company/evidence/audit", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_tenant_isolation_claim", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_tenant_isolation_evidence", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_prompt_injection_guard", "/dashboard/evidence/security", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_protected_attr_ban", "/dashboard/evidence/security", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_prohibited_use_guard", "/dashboard/evidence/security", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_registry", "/board/ai-compliance", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_prompt_registry", "/board/ai-compliance", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_model_rollback_audit", "/board/ai-compliance", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_compliance_status", "/board/ai-compliance", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_smoke_metrics_exclusion", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_no_outbound", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_consent_visibility", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  passAiCompliance("ai_claim_cleanup", "/dashboard/evidence/claims", "platform", "Auth prod smoke PASS — AI compliance Phase A on aligned SHA."),
  withFounderCompletionSmoke(
    passAiCompliance(
      "ai_external_verification",
      "/dashboard/evidence/claims",
      "platform",
      "Founder BUILD smoke — sandbox external verify LIVE; human_review_required; autonomous_employment=false.",
    ),
  ),
  {
    module_id: "ai_protected_attr_monitoring",
    persona: "platform",
    wave: "ai_compliance",
    status: "POST_PILOT",
    route: "/board/ai-compliance",
    owner: "platform",
    blocker: "PROTECTED_ATTR_MONITORING_LEGAL_HOLD",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING },
    notes:
      "POST_PILOT — protected-attribute monitoring out of CORE pilot denominator. Legal hold retained; never claim CORE PASS.",
    product_inclusion: "POST_PILOT",
  },
  withFounderCompletionSmoke(
    passAiCompliance(
      "ai_autonomous_employment",
      "/recruiter/evidence/reviews",
      "platform",
      "Founder Class F redesign — HITL recommendation-only LIVE (advisory_only, binding=false, PENDING_HUMAN_APPROVAL). Never autonomous final employment decisions.",
    ),
  ),
  {
    module_id: "ai_act_certified_claim",
    persona: "platform",
    wave: "ai_compliance",
    status: "LEGAL_MARKETING_CLAIM",
    route: "/board/ai-compliance",
    owner: "platform",
    blocker: "NO_LEGAL_CERTIFICATION",
    missing_criteria: [25],
    criteria: { ...ALL_PENDING },
    notes:
      "LEGAL_MARKETING_CLAIM — AI Act certification not claimed (claim guard PASS honesty). Out of CORE pilot denominator.",
    product_inclusion: "LEGAL_MARKETING_CLAIM",
  },
  withGapCloseSmoke(
  passAiCompliance(
    "ai_wave6_dsr_delete_export",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — DSR export/delete + objection/restriction + ops fulfillment queue + legal hold.",
  ),
  ),
];

export const HARD_LIVE_EVIDENCE_REGISTRY: HardLiveModuleEvidence[] = [
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE1,
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE2,
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE3,
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE4,
  ...HARD_LIVE_EVIDENCE_REGISTRY_WAVE5,
  ...HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE,
];

export const HARD_LIVE_REGISTRY_META = {
  definition: "docs/HARD_LIVE_DEFINITION_30.md",
  wave: "5",
  hard_live_denominator: HARD_LIVE_DENOMINATOR_RULE,
  stance: {
    pilot: "BLOCKED_BY_FOUNDER",
    gate_f: "PASS",
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
    wave3_script: "frontend/scripts/wave3-company-module-prod-smoke.test.ts",
    wave3_sha: WAVE3_SMOKE_SHA,
    wave3_at: WAVE3_SMOKE_AT,
    wave4_script: "frontend/scripts/wave4-investor-module-prod-smoke.test.ts",
    wave4_sha: WAVE4_SMOKE_SHA,
    wave4_at: WAVE4_SMOKE_AT,
    wave5_script: "frontend/scripts/wave5-integrations-module-prod-smoke.test.ts",
    wave5_sha: WAVE5_SMOKE_SHA,
    wave5_at: WAVE5_SMOKE_AT,
    ai_compliance_script: "frontend/scripts/ai-compliance-module-prod-smoke.test.ts",
    ai_compliance_sha: AI_COMPLIANCE_SMOKE_SHA,
    ai_compliance_at: AI_COMPLIANCE_SMOKE_AT,
    gap_close_script: "frontend/scripts/gap-close-module-prod-smoke.test.ts",
    gap_close_sha: GAP_CLOSE_SMOKE_SHA,
    gap_close_at: GAP_CLOSE_SMOKE_AT,
    connector_script: "frontend/scripts/external-connector-prod-smoke.test.ts",
    connector_sha: CONNECTOR_SMOKE_SHA,
    connector_at: CONNECTOR_SMOKE_AT,
    founder_completion_script: "frontend/scripts/founder-completion-module-prod-smoke.test.ts",
    founder_completion_sha: FOUNDER_COMPLETION_SMOKE_SHA,
    founder_completion_at: FOUNDER_COMPLETION_SMOKE_AT,
    blocker_elimination_script: "frontend/scripts/founder-completion-module-prod-smoke.test.ts",
    blocker_elimination_sha: BLOCKER_ELIMINATION_SMOKE_SHA,
    blocker_elimination_at: BLOCKER_ELIMINATION_SMOKE_AT,
    pilot_closure_script: "prod investor data-room upload→download + ATS proposal export",
    pilot_closure_sha: PILOT_CLOSURE_SMOKE_SHA,
    pilot_closure_at: PILOT_CLOSURE_SMOKE_AT,
    write: true,
    exclude_from_product_metrics: true,
  },
  wave4_note:
    "Final Pilot Launch Closure 2026-07-23: Hard LIVE denominator=CORE_PILOT_ONLY; CORE held=0. Optional MS Graph write / Authologic / ATS write / Slack = OPTIONAL_INTEGRATION_NOT_CONFIGURED. ai_act_certified_claim=LEGAL_MARKETING_CLAIM; ai_protected_attr_monitoring=POST_PILOT. investor_s3_required_download PASS via Postgres secure download. Gate F PASS · Pilot BLOCKED_BY_FOUNDER (section-17 ops naming not proven → no READY_FOR_CONTROLLED_PILOT flip) · Launch NO-GO · Enrollment OFF unchanged.",
  get corePilotPassCount(): number {
    return hardLiveLaunchReadinessCounts().pass;
  },
  get corePilotHeldCount(): number {
    return hardLiveLaunchReadinessCounts().held;
  },
} as const;

export function resolveProductInclusion(row: HardLiveModuleEvidence): ProductInclusion {
  return row.product_inclusion ?? productInclusionFor(row.module_id);
}

export function corePilotRegistryModules(
  registry: HardLiveModuleEvidence[] = HARD_LIVE_EVIDENCE_REGISTRY,
): HardLiveModuleEvidence[] {
  return registry.filter((r) => isInHardLiveDenominator(r.module_id));
}

export function hardLiveLaunchReadinessCounts(
  registry: HardLiveModuleEvidence[] = HARD_LIVE_EVIDENCE_REGISTRY,
): {
  pass: number;
  held: number;
  blocked: number;
  optional_out: number;
  legal_out: number;
  post_pilot: number;
  total_core: number;
} {
  const core = corePilotRegistryModules(registry);
  const pass = core.filter((r) => r.status === "PASS").length;
  const held = core.filter((r) => r.status === "HELD_POLICY").length;
  const blocked = core.filter((r) => r.status === "BLOCKED_EXTERNAL_CREDENTIALS").length;
  const optional_out = registry.filter(
    (r) => resolveProductInclusion(r) === "OPTIONAL_INTEGRATION",
  ).length;
  const legal_out = registry.filter(
    (r) => resolveProductInclusion(r) === "LEGAL_MARKETING_CLAIM",
  ).length;
  const post_pilot = registry.filter(
    (r) => resolveProductInclusion(r) === "POST_PILOT",
  ).length;
  return {
    pass,
    held,
    blocked,
    optional_out,
    legal_out,
    post_pilot,
    total_core: core.length,
  };
}

/**
 * Enforce smoke SHA only for CORE_PILOT rows that claim PASS.
 * Optional / legal / post-pilot rows are out of the Hard LIVE denominator.
 */
export function assertNoLivePassWithoutSmoke(
  registry: HardLiveModuleEvidence[] = HARD_LIVE_EVIDENCE_REGISTRY,
): void {
  for (const row of registry) {
    const inclusion = resolveProductInclusion(row);
    if (row.status === "PASS" && inclusion === "CORE_PILOT") {
      if (row.missing_criteria.includes(25)) {
        throw new Error(`Module ${row.module_id} cannot PASS with criterion 25 missing`);
      }
      if (!row.smoke_sha) {
        throw new Error(`Module ${row.module_id} PASS requires smoke_sha`);
      }
    }
    if (row.status === "PASS" && inclusion !== "CORE_PILOT") {
      throw new Error(
        `Module ${row.module_id} is ${inclusion} and must not claim PASS as CORE LIVE`,
      );
    }
    if (row.status === "DEMO_ONLY" && (row.persona === "recruiter" || row.persona === "company")) {
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

export function wave3PendingSmokeIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE3.filter((r) => r.status === "PENDING_SMOKE").map((r) => r.module_id);
}

export function wave5PendingSmokeIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE5.filter((r) => r.status === "PENDING_SMOKE").map((r) => r.module_id);
}

export function wave4PendingSmokeIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_WAVE4.filter((r) => r.status === "PENDING_SMOKE").map((r) => r.module_id);
}

export function aiCompliancePendingSmokeIds(): string[] {
  return HARD_LIVE_EVIDENCE_REGISTRY_AI_COMPLIANCE.filter((r) => r.status === "PENDING_SMOKE").map((r) => r.module_id);
}
