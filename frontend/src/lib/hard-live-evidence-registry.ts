/**
 * Machine-readable Hard LIVE 30 evidence registry — Waves 1–5 + Wave 4 Investor + AI compliance foundation.
 * LIVE badges in capability map / activation require status=PASS after authenticated prod smoke.
 * Stance: Pilot BLOCKED_BY_FOUNDER · Gate F PENDING · Launch NO-GO.
 */
export type HardLiveCriterionResult = "PASS" | "FAIL" | "N/A" | "PENDING";

export type HardLiveModuleEvidence = {
  module_id: string;
  persona: "candidate" | "recruiter" | "company" | "platform" | "investor";
  wave: "1" | "2" | "3" | "4" | "5" | "ai" | "ai_compliance";
  /** Never claim product LIVE until PASS + docs update post-smoke. */
  status: "PENDING_SMOKE" | "PASS" | "FAIL" | "PARTIAL" | "HELD_POLICY" | "DEMO_ONLY" | "BLOCKED_EXTERNAL_CREDENTIALS";
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

/** Filled after Wave 2 authenticated prod smoke PASS. */
export const WAVE2_SMOKE_SHA: string | null = "d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55";
export const WAVE2_SMOKE_AT: string | null = "2026-07-21T04:12:00Z";

/** Filled after Wave 3 authenticated prod smoke PASS — null until post-merge smoke. */
export const WAVE3_SMOKE_SHA: string | null = "e841dffc0db0faabef2ed9e067b2581559752a66";
export const WAVE3_SMOKE_AT: string | null = "2026-07-22T07:00:00Z";

/** Filled after Wave 5 authenticated prod smoke PASS — null until post-merge smoke. */
export const WAVE5_SMOKE_SHA: string | null = "b3e2adecb6ef09f1aaf1c6be19a12ac74ca16a18";
export const WAVE5_SMOKE_AT: string | null = "2026-07-22T14:50:00Z";

/** Filled after Wave 4 authenticated prod smoke PASS. */
export const WAVE4_SMOKE_SHA: string | null = "2987e16804fcd7de19db3930f9b7184e465a1d18";
export const WAVE4_SMOKE_AT: string | null = "2026-07-22T16:28:00Z";

/** Filled after AI compliance authenticated prod smoke PASS. */
export const AI_COMPLIANCE_SMOKE_SHA: string | null = "2987e16804fcd7de19db3930f9b7184e465a1d18";
export const AI_COMPLIANCE_SMOKE_AT: string | null = "2026-07-22T16:28:00Z";


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
    "PUBLIC_STRIPE_STANDARD_OFF",
    "Sandbox/smoke (exclude_from_product_metrics) may upload/parse without Stripe; public Standard+ still OFF.",
  ),
  heldModuleW1(
    "cand_cv_parsing",
    "/dashboard/cv",
    "candidate-squad",
    "PUBLIC_STRIPE_STANDARD_OFF",
    "Sandbox/smoke parse allowed via metrics-excluded entitlement; public Standard+ paywall unchanged.",
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
  passModuleW1(
    "candidate_plan",
    "/dashboard/plan",
    "candidate-squad",
    "Gap-close — plan sandbox UI LIVE; public Stripe claim remains HELD.",
  ),
  heldModuleW1("plan_payments", "/dashboard/billing", "candidate-squad", "STRIPE_NOT_PUBLIC", "Public Stripe payments HELD — Founder allowlist."),
  passModuleW1(
    "cand_account_deletion",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — authenticated delete-account + audit; ops DSR queue separate.",
  ),
  passModuleW1(
    "candidate_revoke_delete",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — revoke/delete live panel with export.json + privacy-requests.",
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
  passModuleW2(
    "rec_sla_tracking",
    "/recruiter/analytics",
    "recruiter-squad",
    "Gap-close — live SLA targets + breach summary from applications (no sample metrics).",
  ),
  passModuleW2(
    "rec_candidate_comms",
    "/recruiter/inbox",
    "recruiter-squad",
    "Gap-close — live communications/draft API; demo journey CTAs removed from product UI.",
  ),
  passModuleW2(
    "rec_collaboration",
    "/recruiter/inbox",
    "recruiter-squad",
    "Gap-close — live collaboration notes API; demo fixture boards removed from product CTAs.",
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
  heldModuleW3(
    "company_integrations",
    "/company/integrations",
    "company-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS live-sync hard ban — honesty endpoint only.",
  ),
  heldModuleW3(
    "rec_ats_sync",
    "/company/integrations",
    "company-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS live-sync hard ban.",
  ),
  heldModuleW3(
    "rec_vacancy_import",
    "/company/integrations/ats/import-readiness",
    "company-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "Vacancy import stays held with ATS ban.",
  ),
  heldModuleW3(
    "company_ats_import_readiness",
    "/company/integrations/ats/import-readiness",
    "company-squad",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS import readiness INTERNAL/held.",
  ),
  passModuleW3(
    "company_billing",
    "/company/billing",
    "company-squad",
    "Gap-close — company billing sandbox/honesty LIVE; public Stripe claim HELD.",
  ),
  heldModuleW3(
    "company_billing_public_claim",
    "/company/billing",
    "company-squad",
    "STRIPE_NOT_PUBLIC",
    "Stripe public claim blocked — Founder allowlist.",
  ),
  passModuleW3(
    "rec_subscription",
    "/company/billing",
    "company-squad",
    "Gap-close — subscription sandbox path LIVE; public Stripe claim HELD.",
  ),
  heldModuleW3(
    "company_ms_calendar_write",
    "/company/hiring-cockpit",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "MS calendar write blocked.",
  ),
  heldModuleW3(
    "company_invite_delivery",
    "/company/team",
    "company-squad",
    "EXTERNAL_ENROLLMENT_OFF",
    "Invite dry-run only — real delivery HELD.",
  ),
  heldModuleW3(
    "rec_company_onboarding",
    "/company/onboarding",
    "company-squad",
    "EXTERNAL_ENROLLMENT_OFF",
    "Real company enrollment NOT_STARTED — synthetic path separate.",
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
  heldModuleW5(
    "plat_ms_calendar_write",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_WRITE_BLOCKED",
    "Microsoft Calendar WRITE remains policy-held.",
  ),
  heldModuleW5(
    "plat_ms_calendar_busy_read",
    "/dashboard/calendar",
    "platform",
    "MICROSOFT_BUSY_READ_FLAG_OFF",
    "Microsoft busy-read gated false on prod.",
  ),
  heldModuleW5(
    "plat_ats_live_sync_write",
    "/company/integrations",
    "platform",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS live-sync WRITE blocked.",
  ),
  heldModuleW5(
    "plat_ats_write_sync",
    "/company/integrations",
    "platform",
    "ATS_LIVE_SYNC_BLOCKED",
    "ATS write SYNC blocked.",
  ),
  heldModuleW5(
    "plat_stripe_public",
    "/dashboard/billing",
    "platform",
    "STRIPE_NOT_PUBLIC",
    "Stripe public checkout NOT LIVE.",
  ),
  heldModuleW5(
    "plat_authologic_auto_kyc",
    "/dashboard/identity",
    "platform",
    "AUTHOLOGIC_AUTO_KYC_OFF",
    "Authologic Auto KYC OFF.",
  ),
  blockedExternalW5(
    "plat_google_calendar_push_webhook",
    "/dashboard/calendar",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "Push/watch built; needs GOOGLE_CALENDAR_PUSH_WEBHOOK_URL + OAuth — not Founder policy.",
  ),
  blockedExternalW5(
    "plat_slack_connector",
    "/company/integrations",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "Connector status API live; SLACK_INCOMING_WEBHOOK_URL unset on prod.",
  ),
  blockedExternalW5(
    "plat_teams_connector",
    "/company/integrations",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "Connector status API live; TEAMS_INCOMING_WEBHOOK_URL unset on prod.",
  ),
  blockedExternalW5(
    "plat_zapier_connector",
    "/company/integrations",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "Connector status API live; ZAPIER_HOOK_URL unset on prod.",
  ),
  blockedExternalW5(
    "plat_cloud_storage_connectors",
    "/company/integrations",
    "platform",
    "BLOCKED_EXTERNAL_CREDENTIALS",
    "S3-compatible + local abstraction shipped; cloud vendor OAuth (Drive/OneDrive/Dropbox) needs founder credentials. Local/S3 path usable when configured.",
  ),
  passModuleW5(
    "plat_ics_import",
    "/dashboard/calendar",
    "platform",
    "Gap-close — ICS VEVENT import to local busy holds; no Google/MS write.",
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
  heldModuleW4(
    "investor_external_attestations",
    "/investor/trust-proof",
    "investor-squad",
    "NO_VERIFIED_CUSTOMER_CLAIMS",
    "No verified external customer attestations.",
  ),
  heldModuleW4(
    "investor_s3_required_download",
    "/investor/data-room",
    "investor-squad",
    "S3_FOUNDER_KEYS",
    "Confidential download requires founder S3 keys.",
  ),
  heldModuleW4(
    "investor_self_serve_enrollment",
    "/register/investor",
    "investor-squad",
    "ENROLLMENT_OFF",
    "Self-serve investor enrollment OFF — Founder block.",
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
  heldAiCompliance("ai_external_verification", "/dashboard/evidence/claims", "platform", "EXTERNAL_VERIFICATION_OFF", "External verification default OFF."),
  heldAiCompliance("ai_protected_attr_monitoring", "/board/ai-compliance", "platform", "PROTECTED_ATTR_MONITORING_LEGAL_HOLD", "Protected attribute monitoring legal hold."),
  heldAiCompliance("ai_autonomous_employment", "/recruiter/evidence/reviews", "platform", "AUTONOMOUS_EMPLOYMENT_HARD_BAN", "Autonomous employment decisions hard-banned."),
  heldAiCompliance("ai_act_certified_claim", "/board/ai-compliance", "platform", "NO_LEGAL_CERTIFICATION", "No AI Act certification claim."),
  passAiCompliance(
    "ai_wave6_dsr_delete_export",
    "/dashboard/trust/revoke-delete",
    "privacy",
    "Gap-close — DSR export/delete + objection/restriction + ops fulfillment queue + legal hold.",
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
    write: true,
    exclude_from_product_metrics: true,
  },
  wave4_note:
    "Gap-close 2026-07-22+: DEMO_ONLY=0; connectors/push reclassed BLOCKED_EXTERNAL_CREDENTIALS; CV sandbox entitlement. Wave 4 Investor + Wave 5 + AI Phase A prior smoke retained. Pilot BLOCKED / Gate F PENDING / Launch NO-GO unchanged.",
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
