/**
 * Product inclusion taxonomy — Founder Final Pilot Launch Closure.
 * Hard LIVE launch-readiness denominator = CORE_PILOT only.
 * Optional vendors / legal marketing claims stay in inventory (truthful reclass, not deleted).
 */

export type ProductInclusion =
  | "CORE_PILOT"
  | "POST_PILOT"
  | "OPTIONAL_INTEGRATION"
  | "LEGAL_MARKETING_CLAIM"
  | "INTERNAL_ONLY"
  | "REMOVED_FROM_PRODUCT";

/** Hard LIVE denominator rule — only CORE_PILOT modules count toward launch readiness. */
export const HARD_LIVE_DENOMINATOR_RULE = "CORE_PILOT_ONLY" as const;

/**
 * Explicit overrides + CORE defaults for every Hard LIVE module_id.
 * Former HELD/BLOCKED optional vendors leave the denominator; CORE counterparts remain PASS elsewhere.
 */
export const PRODUCT_INCLUSION_BY_MODULE_ID: Record<string, ProductInclusion> = {
  // --- Former HELD/BLOCKED reclass (leave Hard LIVE denominator) ---
  /** Graph write optional; CORE = ICS/holds (already PASS). */
  cand_ms_calendar: "OPTIONAL_INTEGRATION",
  company_ms_calendar_write: "OPTIONAL_INTEGRATION",
  plat_ms_calendar_write: "OPTIONAL_INTEGRATION",
  /** Vendor Authologic optional; CORE = candidate_identity_verification (manual review PASS). */
  plat_identity_kyc: "OPTIONAL_INTEGRATION",
  plat_authologic_auto_kyc: "OPTIONAL_INTEGRATION",
  /** ATS live WRITE optional; CORE = dry-run/export/preview (already PASS). */
  plat_ats_live_sync_write: "OPTIONAL_INTEGRATION",
  plat_ats_write_sync: "OPTIONAL_INTEGRATION",
  /** Slack optional; CORE = email/in-app notifications (already PASS). */
  plat_slack_connector: "OPTIONAL_INTEGRATION",
  /** Post-pilot monitoring — not required for pilot launch. */
  ai_protected_attr_monitoring: "POST_PILOT",
  /** Legal / marketing claim — certification not claimed (honesty PASS elsewhere). */
  ai_act_certified_claim: "LEGAL_MARKETING_CLAIM",
  /**
   * CORE secure download path (provider-neutral). Stays CORE_PILOT;
   * registry may remain HELD until BE secure download is ready (parent TODO).
   */
  investor_s3_required_download: "CORE_PILOT",

  // --- Wave 1 candidate (CORE) ---
  candidate_consent_receipt: "CORE_PILOT",
  candidate_control_center: "CORE_PILOT",
  candidate_correction_request: "CORE_PILOT",
  candidate_data_portability: "CORE_PILOT",
  candidate_export_preview: "CORE_PILOT",
  candidate_identity_verification: "CORE_PILOT",
  candidate_trust_audit_export: "CORE_PILOT",
  candidate_trust_overview: "CORE_PILOT",
  cand_notifications: "CORE_PILOT",
  cand_preferences: "CORE_PILOT",
  cand_cv_import: "CORE_PILOT",
  cand_cv_parsing: "CORE_PILOT",
  cand_feedback: "CORE_PILOT",
  cand_match_explanation: "CORE_PILOT",
  auto_apply: "CORE_PILOT",
  candidate_plan: "CORE_PILOT",
  plan_payments: "CORE_PILOT",
  cand_account_deletion: "CORE_PILOT",
  candidate_revoke_delete: "CORE_PILOT",

  // --- Wave 2 recruiter (CORE) ---
  recruiter_talent_radar: "CORE_PILOT",
  recruiter_talent_radar_digest: "CORE_PILOT",
  recruiter_talent_pool_import: "CORE_PILOT",
  rec_scorecards: "CORE_PILOT",
  rec_notes: "CORE_PILOT",
  rec_matching: "CORE_PILOT",
  rec_hiring_funnel_analytics: "CORE_PILOT",
  recruiter_jobs: "CORE_PILOT",
  recruiter_inbox: "CORE_PILOT",
  recruiter_pipeline: "CORE_PILOT",
  recruiter_search: "CORE_PILOT",
  recruiter_talent_pool: "CORE_PILOT",
  recruiter_analytics: "CORE_PILOT",
  recruiter_notification_preferences: "CORE_PILOT",
  recruiter_activity_timeline: "CORE_PILOT",
  recruiter_trust_review_queue: "CORE_PILOT",
  recruiter_saved_views: "CORE_PILOT",
  rec_decisioning: "CORE_PILOT",
  rec_shortlist: "CORE_PILOT",
  recruiter_daily_cockpit: "CORE_PILOT",
  rec_interview_scheduling: "CORE_PILOT",
  recruiter_calendar: "CORE_PILOT",
  recruiter_integrations: "CORE_PILOT",
  investor_sor_proof_ats: "CORE_PILOT",
  rec_recruiter_onboarding: "CORE_PILOT",
  rec_sla_tracking: "CORE_PILOT",
  rec_candidate_comms: "CORE_PILOT",
  rec_collaboration: "CORE_PILOT",

  // --- Wave 3 company (CORE) ---
  company_dashboard: "CORE_PILOT",
  company_pipeline: "CORE_PILOT",
  company_roles: "CORE_PILOT",
  rec_vacancy_creation: "CORE_PILOT",
  company_hiring_cockpit: "CORE_PILOT",
  company_hiring_command_center: "CORE_PILOT",
  company_talent_pool: "CORE_PILOT",
  company_team: "CORE_PILOT",
  company_candidate_trust_summary: "CORE_PILOT",
  company_org_settings: "CORE_PILOT",
  company_permissions: "CORE_PILOT",
  company_analytics: "CORE_PILOT",
  company_audit_log: "CORE_PILOT",
  company_scorecards: "CORE_PILOT",
  company_notifications: "CORE_PILOT",
  company_onboarding_synthetic: "CORE_PILOT",
  company_integrations: "CORE_PILOT",
  rec_ats_sync: "CORE_PILOT",
  rec_vacancy_import: "CORE_PILOT",
  company_ats_import_readiness: "CORE_PILOT",
  company_billing: "CORE_PILOT",
  company_billing_public_claim: "CORE_PILOT",
  rec_subscription: "CORE_PILOT",
  company_invite_delivery: "CORE_PILOT",
  rec_company_onboarding: "CORE_PILOT",

  // --- Wave 4 investor (CORE) ---
  investor_data_room: "CORE_PILOT",
  investor_nda_acceptance: "CORE_PILOT",
  investor_data_room_list: "CORE_PILOT",
  investor_placement_readonly: "CORE_PILOT",
  investor_trust_proof_readonly: "CORE_PILOT",
  investor_login_gate: "CORE_PILOT",
  board_implementation_tracker: "CORE_PILOT",
  investor_metrics_wave4: "CORE_PILOT",
  investor_roadmap_wave4: "CORE_PILOT",
  investor_calculator_wave4: "CORE_PILOT",
  investor_contact_wave4: "CORE_PILOT",
  investor_product_proof_boundary: "CORE_PILOT",
  investor_external_attestations: "CORE_PILOT",
  investor_self_serve_enrollment: "CORE_PILOT",

  // --- Wave 5 platform / calendar (CORE = Google + ICS/holds; MS write optional above) ---
  plat_google_calendar_oauth: "CORE_PILOT",
  plat_google_calendar_read: "CORE_PILOT",
  plat_google_calendar_write: "CORE_PILOT",
  plat_google_calendar_availability: "CORE_PILOT",
  plat_google_calendar_monitoring: "CORE_PILOT",
  plat_ics_export: "CORE_PILOT",
  plat_ics_share_token: "CORE_PILOT",
  plat_webcal_subscribe: "CORE_PILOT",
  plat_ics_cancel_uid: "CORE_PILOT",
  plat_ms_calendar_oauth_config: "CORE_PILOT",
  plat_ats_config_read: "CORE_PILOT",
  plat_ats_webhook_verify: "CORE_PILOT",
  plat_email_draft: "CORE_PILOT",
  plat_notifications_prefs: "CORE_PILOT",
  plat_oauth_providers_status: "CORE_PILOT",
  plat_csv_export_safe: "CORE_PILOT",
  plat_integration_inventory: "CORE_PILOT",
  plat_webhook_delivery_ledger: "CORE_PILOT",
  plat_ms_calendar_busy_read: "CORE_PILOT",
  plat_stripe_public: "CORE_PILOT",
  plat_google_calendar_push_webhook: "CORE_PILOT",
  plat_teams_connector: "CORE_PILOT",
  plat_zapier_connector: "CORE_PILOT",
  plat_cloud_storage_connectors: "CORE_PILOT",
  plat_ics_import: "CORE_PILOT",

  // --- AI compliance foundation (CORE; legal/post-pilot overrides above) ---
  ai_claim_declared: "CORE_PILOT",
  ai_claim_extracted: "CORE_PILOT",
  ai_claim_inferred: "CORE_PILOT",
  ai_claim_provenance: "CORE_PILOT",
  ai_claim_human_confirm: "CORE_PILOT",
  ai_claim_evidence_link: "CORE_PILOT",
  ai_claim_evidence_backed: "CORE_PILOT",
  ai_claim_dispute: "CORE_PILOT",
  ai_claim_dispute_resolve: "CORE_PILOT",
  ai_claim_supersede: "CORE_PILOT",
  ai_claim_history: "CORE_PILOT",
  ai_decision_log: "CORE_PILOT",
  ai_explainability: "CORE_PILOT",
  ai_human_override: "CORE_PILOT",
  ai_override_audit: "CORE_PILOT",
  ai_tenant_isolation_claim: "CORE_PILOT",
  ai_tenant_isolation_evidence: "CORE_PILOT",
  ai_prompt_injection_guard: "CORE_PILOT",
  ai_protected_attr_ban: "CORE_PILOT",
  ai_prohibited_use_guard: "CORE_PILOT",
  ai_registry: "CORE_PILOT",
  ai_prompt_registry: "CORE_PILOT",
  ai_model_rollback_audit: "CORE_PILOT",
  ai_compliance_status: "CORE_PILOT",
  ai_smoke_metrics_exclusion: "CORE_PILOT",
  ai_no_outbound: "CORE_PILOT",
  ai_consent_visibility: "CORE_PILOT",
  ai_claim_cleanup: "CORE_PILOT",
  ai_external_verification: "CORE_PILOT",
  ai_autonomous_employment: "CORE_PILOT",
  ai_wave6_dsr_delete_export: "CORE_PILOT",
};

export function productInclusionFor(moduleId: string): ProductInclusion {
  return PRODUCT_INCLUSION_BY_MODULE_ID[moduleId] ?? "CORE_PILOT";
}

/** True when module_id counts toward Hard LIVE launch-readiness (CORE_PILOT only). */
export function isInHardLiveDenominator(module_id: string): boolean {
  return productInclusionFor(module_id) === "CORE_PILOT";
}
