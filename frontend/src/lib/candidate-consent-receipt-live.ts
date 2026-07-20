/** Build live consent-receipt record from Wave 1 trust live bundle. */

import type { CandidateConsentReceiptRecord } from "@/lib/candidate-consent-receipt-demo-data";
import type { TrustLiveBundle } from "@/lib/candidate-trust-live";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateIdentityVerificationHref } from "@/lib/candidate-identity-verification";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";

export const CANDIDATE_CONSENT_RECEIPT_LIVE_FILENAME = "twin-consent-receipt-live.json";

export function liveBundleToConsentReceiptRecord(bundle: TrustLiveBundle): CandidateConsentReceiptRecord {
  const generatedAt = bundle.generated_at;
  const consentItems = (bundle.consents.items ?? []).map((item) => ({
    id: item.purpose,
    purpose: item.purpose.replace(/_/g, " "),
    status: item.status,
    note: item.note,
  }));
  const auditEvents = (bundle.audit_events.items ?? []).map((ev) => ({
    id: String(ev.id),
    workflow: "trust_center",
    type: ev.event_type,
    at: typeof ev.created_at === "string" ? ev.created_at : String(ev.created_at),
    summary: ev.summary,
    backend_write: false as const,
  }));
  return {
    id: String(bundle.candidate_id),
    display_name: bundle.display_name,
    headline: bundle.trust.twin_knows_summary,
    role_id: "",
    role_title: "—",
    receipt_label: "LIVE_PATH",
    last_reviewed_at: generatedAt,
    pilot_labelled: true as const,
    linked_modules: [
      {
        id: "trust_center",
        href: candidateTrustCenterHref(),
        label: "Trust center",
        module_family: "trust",
      },
      {
        id: "control_center",
        href: candidateControlCenterHref(),
        label: "Control center",
        module_family: "trust",
      },
      {
        id: "corrections",
        href: candidateCorrectionRequestHref(),
        label: "Corrections",
        module_family: "trust",
      },
      {
        id: "portability",
        href: candidateDataPortabilityHref(),
        label: "Portability",
        module_family: "trust",
      },
      {
        id: "audit_export",
        href: candidateTrustAuditExportHref(),
        label: "Audit export",
        module_family: "trust",
      },
      {
        id: "export_preview",
        href: candidateExportPreviewHref(),
        label: "Export",
        module_family: "trust",
      },
      {
        id: "identity",
        href: candidateIdentityVerificationHref(),
        label: "Identity",
        module_family: "trust",
      },
      {
        id: "revoke_delete",
        href: candidateRevokeDeleteHref(),
        label: "Revoke / delete",
        module_family: "trust",
      },
    ],
    bundle: {
      receipt_metadata: {
        consent_receipt_preview: true,
        backend_write: false,
        demo_only: false,
        legal_claim: false,
        generated_locally: false,
        candidate_id: String(bundle.candidate_id),
        role_id: "",
        generated_at: generatedAt,
        bundle_version: "2026-07-20-wave1-live-1",
        filename: CANDIDATE_CONSENT_RECEIPT_LIVE_FILENAME,
      },
      consent_snapshot: {
        consent_items: consentItems,
        communication_preferences: [
          {
            channel: "email_product_updates",
            status: bundle.communication_preferences.email_product_updates ? "opt_in" : "disabled",
            note: "Persisted on user — no outbound in smoke",
          },
          {
            channel: "email_interview_reminders",
            status: bundle.communication_preferences.email_interview_reminders ? "opt_in" : "disabled",
            note: "Persisted on user — no outbound in smoke",
          },
        ],
        human_decision_note: bundle.manual_processing_notice ?? "",
        last_reviewed_at: generatedAt,
      },
      accepted_context: {
        candidate_id: String(bundle.candidate_id),
        role_id: "",
        role_title: "—",
        display_name: bundle.display_name,
        headline: bundle.trust.twin_knows_summary,
        gdpr_consent_path: CANDIDATE_CANONICAL_ROUTES.trust,
        pilot_scope: "Wave 1 live path — Pilot still BLOCKED_BY_FOUNDER",
      },
      acknowledged_boundaries: [
        "No auto-apply",
        "Microsoft calendar write blocked",
        "No real outbound emails in smoke",
        "External pilot enrollment disabled",
      ],
      covered_candidate_controls: [
        "consents",
        "consent_receipts",
        "privacy_requests",
        "audit_events",
        "notification_preferences",
      ],
      excluded_scope: [
        "auto_apply",
        "stripe_public_checkout",
        "ats_live_sync",
        "microsoft_calendar_write",
        "fake_kyc_success",
      ],
      linked_trust_modules: [
        {
          id: "consent_receipt",
          href: candidateConsentReceiptHref(),
          label: "Consent receipt",
          module_family: "trust",
        },
      ],
      system_of_record_links: [
        {
          id: "trust",
          href: candidateTrustCenterHref(),
          label: "Trust hub",
          module_family: "trust",
        },
      ],
      audit_events: auditEvents,
      evidence_references: (bundle.consent_receipts.items ?? []).slice(0, 10).map((r) => ({
        id: `receipt-${r.id}`,
        href: candidateConsentReceiptHref(),
        kind: "consent_receipt",
        summary: `${r.consent_purpose} · ${r.action}`,
        at: typeof r.created_at === "string" ? r.created_at : String(r.created_at),
      })),
      safety_boundaries: {
        no_live_export: true,
        no_ticket: true,
        no_email: true,
        human_decision_required: true,
        notes: [
          "Live path uses authenticated APIs; legal fulfillment remains manual where required.",
          "LIVE capability badge requires Hard LIVE 30 + authenticated prod smoke PASS.",
        ],
      },
    },
  };
}
