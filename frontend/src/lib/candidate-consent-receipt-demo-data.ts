/** Deterministic candidate trust consent receipt bundle — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { getCandidateTrustCenterDemo } from "@/lib/candidate-trust-center-demo-data";
import { buildCandidateExportPreviewBundle } from "@/lib/candidate-export-preview-demo-data";
import { buildCandidateCorrectionRequestBundle } from "@/lib/candidate-correction-request-demo-data";
import { getCandidateIdentityVerificationDemo } from "@/lib/candidate-identity-verification-demo-data";
import { buildCandidateDataPortabilityBundle } from "@/lib/candidate-data-portability-demo-data";
import { buildCandidateRevokeDeleteBundle } from "@/lib/candidate-revoke-delete-demo-data";
import { buildCandidateTrustAuditExportBundle } from "@/lib/candidate-trust-audit-export-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateIdentityVerificationHref } from "@/lib/candidate-identity-verification";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_CONSENT_RECEIPT_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_CONSENT_RECEIPT_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_CONSENT_RECEIPT_FILENAME =
  "twin-demo-candidate-001-consent-receipt-preview.json";
export const CANDIDATE_CONSENT_RECEIPT_GENERATED_AT = "2026-06-18T21:00:00Z";
export const CANDIDATE_CONSENT_RECEIPT_BUNDLE_VERSION = "2026-06-18-consent-receipt-preview-1";

export type ConsentReceiptAuditEvent = {
  id: string;
  workflow: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type ConsentReceiptEvidenceRef = {
  id: string;
  href: string;
  kind: string;
  summary: string;
  at: string;
};

export type ConsentReceiptLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type CandidateConsentReceiptMetadata = {
  consent_receipt_preview: true;
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  generated_locally: true;
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
  filename: string;
};

export type CandidateConsentReceiptBundle = {
  receipt_metadata: CandidateConsentReceiptMetadata;
  consent_snapshot: {
    consent_items: Array<{ id: string; purpose: string; status: string; note: string }>;
    communication_preferences: Array<{ channel: string; status: string; note: string }>;
    human_decision_note: string;
    last_reviewed_at: string;
  };
  accepted_context: {
    candidate_id: string;
    role_id: string;
    role_title: string;
    display_name: string;
    headline: string;
    gdpr_consent_path: string;
    pilot_scope: string;
  };
  acknowledged_boundaries: string[];
  covered_candidate_controls: string[];
  excluded_scope: string[];
  linked_trust_modules: ConsentReceiptLinkedModule[];
  system_of_record_links: ConsentReceiptLinkedModule[];
  audit_events: ConsentReceiptAuditEvent[];
  evidence_references: ConsentReceiptEvidenceRef[];
  safety_boundaries: {
    no_live_export: true;
    no_ticket: true;
    no_email: true;
    human_decision_required: true;
    notes: string[];
  };
};

export type CandidateConsentReceiptRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  receipt_label: string;
  last_reviewed_at: string;
  bundle: CandidateConsentReceiptBundle;
  linked_modules: ConsentReceiptLinkedModule[];
  pilot_labelled: true;
};

const DEMO_COVERED = [
  "Trust center consent items and communication preferences",
  "Control center visibility and consent review controls",
  "Export preview scope acknowledgement",
  "Identity verification pilot boundaries",
  "Correction request draft preview",
  "Data portability scope checklist",
  "Revoke & delete impact preview",
  "Trust audit export cross-workflow events",
] as const;

const DEMO_EXCLUDED = [
  "Real contact addresses or phone numbers",
  "Live ATS mutation or sync records",
  "Outbound messaging or outreach logs",
  "OAuth tokens or calendar credentials",
  "Submitted support tickets or backend requests",
  "Legal compliance certificates or attestations",
] as const;

const DEMO_BOUNDARIES = [
  "Demo-only preview — not legal advice or a compliance certificate.",
  "No backend write from consent receipt download — JSON generated locally.",
  "Human decision required before recruiter-facing trust signals change.",
  "Identity verification provider consent not live on this pilot.",
  "Auto-apply and bulk outreach remain not live — prepare-only.",
] as const;

function mapAuditEvents(
  workflow: string,
  events: Array<{ id: string; type: string; at: string; summary: string }>,
): ConsentReceiptAuditEvent[] {
  return events.map((e) => ({
    id: e.id,
    workflow,
    type: e.type,
    at: e.at,
    summary: e.summary,
    backend_write: false as const,
  }));
}

function flattenTrustAuditExportEvents(): ConsentReceiptAuditEvent[] {
  const audit = buildCandidateTrustAuditExportBundle();
  const groups = [
    { workflow: "trust_audit_export", events: audit.trust_center_events },
    { workflow: "trust_audit_export", events: audit.control_center_events },
    { workflow: "trust_audit_export", events: audit.export_preview_events },
    { workflow: "trust_audit_export", events: audit.correction_request_events },
    { workflow: "trust_audit_export", events: audit.portability_request_events },
    { workflow: "trust_audit_export", events: audit.revoke_delete_events },
  ];
  return groups.flatMap(({ workflow, events }) => mapAuditEvents(workflow, events));
}

export function buildCandidateConsentReceiptBundle(): CandidateConsentReceiptBundle {
  const control = getCandidateControlCenterDemo();
  const trust = getCandidateTrustCenterDemo();
  const exportPreview = buildCandidateExportPreviewBundle();
  const correction = buildCandidateCorrectionRequestBundle();
  const identity = getCandidateIdentityVerificationDemo();
  const portability = buildCandidateDataPortabilityBundle();
  const revokeDelete = buildCandidateRevokeDeleteBundle();
  const candidateId = CANDIDATE_CONSENT_RECEIPT_DEMO_ID;
  const roleId = CANDIDATE_CONSENT_RECEIPT_DEMO_ROLE_ID;

  const trustCenterEvents = mapAuditEvents("trust_center", trust.trust_timeline);
  const controlCenterEvents = mapAuditEvents("control_center", control.audit_timeline);
  const exportPreviewEvents = mapAuditEvents("export_preview", exportPreview.audit_preview_events);
  const identityEvents = mapAuditEvents("identity_verification", identity.bundle.audit_timeline);
  const correctionEvents = mapAuditEvents("correction_request", correction.audit_preview_events);
  const portabilityEvents = mapAuditEvents("portability_request", portability.audit_preview_events);
  const revokeDeleteEvents = mapAuditEvents("revoke_delete", revokeDelete.audit_preview_events);
  const auditExportEvents = flattenTrustAuditExportEvents();

  const linkedTrustModules: ConsentReceiptLinkedModule[] = [
    {
      id: "link_trust_center",
      href: candidateTrustCenterHref(),
      label: "Candidate trust center",
      module_family: "trust",
    },
    {
      id: "link_control_center",
      href: candidateControlCenterHref(),
      label: "Candidate control center",
      module_family: "trust",
    },
    {
      id: "link_export_preview",
      href: candidateExportPreviewHref(),
      label: "Export preview",
      module_family: "trust",
    },
    {
      id: "link_identity_verification",
      href: candidateIdentityVerificationHref(),
      label: "Identity verification",
      module_family: "trust",
    },
    {
      id: "link_corrections",
      href: candidateCorrectionRequestHref(),
      label: "Correction request",
      module_family: "trust",
    },
    {
      id: "link_portability",
      href: candidateDataPortabilityHref(),
      label: "Data portability",
      module_family: "trust",
    },
    {
      id: "link_revoke_delete",
      href: candidateRevokeDeleteHref(),
      label: "Revoke & delete",
      module_family: "trust",
    },
    {
      id: "link_audit_export",
      href: candidateTrustAuditExportHref(),
      label: "Trust audit export",
      module_family: "trust",
    },
    {
      id: "link_consent_receipt",
      href: CANDIDATE_CANONICAL_ROUTES.trustConsentReceipt,
      label: "Consent receipt",
      module_family: "trust",
    },
  ];

  const systemOfRecordLinks: ConsentReceiptLinkedModule[] = [
    ...linkedTrustModules,
    {
      id: "sor_dashboard",
      href: CANDIDATE_CANONICAL_ROUTES.panel,
      label: "Candidate dashboard",
      module_family: "workspace",
    },
    {
      id: "sor_jobs",
      href: CANDIDATE_CANONICAL_ROUTES.jobs,
      label: "Jobs workspace",
      module_family: "workspace",
    },
    {
      id: "sor_matches",
      href: CANDIDATE_CANONICAL_ROUTES.matches,
      label: "Matches workspace",
      module_family: "workspace",
    },
    {
      id: "sor_profile",
      href: CANDIDATE_CANONICAL_ROUTES.profile,
      label: "Profile workspace",
      module_family: "profile",
    },
  ];

  const auditEvents = [
    ...trustCenterEvents,
    ...controlCenterEvents,
    ...exportPreviewEvents,
    ...identityEvents,
    ...correctionEvents,
    ...portabilityEvents,
    ...revokeDeleteEvents,
    ...auditExportEvents,
  ];

  return {
    receipt_metadata: {
      consent_receipt_preview: true,
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      generated_locally: true,
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_CONSENT_RECEIPT_GENERATED_AT,
      bundle_version: CANDIDATE_CONSENT_RECEIPT_BUNDLE_VERSION,
      filename: CANDIDATE_CONSENT_RECEIPT_FILENAME,
    },
    consent_snapshot: {
      consent_items: trust.consent_items.map((item) => ({
        id: item.id,
        purpose: item.purpose,
        status: item.status,
        note: item.note,
      })),
      communication_preferences: trust.communication_preferences.map((pref) => ({
        channel: pref.channel,
        status: pref.status,
        note: pref.note,
      })),
      human_decision_note: trust.human_decision_note,
      last_reviewed_at: trust.last_reviewed_at,
    },
    accepted_context: {
      candidate_id: candidateId,
      role_id: roleId,
      role_title: control.role_title,
      display_name: control.display_name,
      headline: control.headline,
      gdpr_consent_path: "/consent/gdpr",
      pilot_scope: "demo-candidate-001 trust hexad — preview only, no live outreach.",
    },
    acknowledged_boundaries: [...DEMO_BOUNDARIES],
    covered_candidate_controls: [
      ...control.visibility_controls.map((v) => `${v.label}: ${v.current}`),
      ...control.consent_review_items.map((c) => `Consent review — ${c.purpose}: ${c.status}`),
      ...DEMO_COVERED,
    ],
    excluded_scope: [...DEMO_EXCLUDED],
    linked_trust_modules: linkedTrustModules,
    system_of_record_links: systemOfRecordLinks,
    audit_events: auditEvents,
    evidence_references: [
      {
        id: "ev-consent-001",
        href: candidateTrustCenterHref(),
        kind: "trust_center_consent",
        summary: "Trust center consent items reviewed on pilot — no outbound contact.",
        at: "2026-06-10T09:00:00Z",
      },
      {
        id: "ev-consent-002",
        href: decisionMemoryHref(candidateId, "recruiter"),
        kind: "decision_memory",
        summary: "Match surfaced for demo-role-001 — recruiter review queue, human decision required.",
        at: "2026-06-08T10:00:00Z",
      },
      {
        id: "ev-consent-003",
        href: candidateProfile360Href(candidateId, "recruiter"),
        kind: "profile_360",
        summary: "Profile 360 recruiter view — sample evidence link, no contact PII.",
        at: "2026-06-09T11:00:00Z",
      },
    ],
    safety_boundaries: {
      no_live_export: true,
      no_ticket: true,
      no_email: true,
      human_decision_required: true,
      notes: [
        "Consent receipt preview only — not legal advice or a compliance certificate.",
        "JSON generated locally in the browser — no backend mutation.",
        "Human decision required on recruiter-facing actions and trust signals.",
      ],
    },
  };
}

const DEMO_RECORD: CandidateConsentReceiptRecord = {
  id: CANDIDATE_CONSENT_RECEIPT_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_CONSENT_RECEIPT_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  receipt_label: "Trust consent receipt bundle · demo-candidate-001",
  last_reviewed_at: CANDIDATE_CONSENT_RECEIPT_GENERATED_AT,
  bundle: buildCandidateConsentReceiptBundle(),
  linked_modules: buildCandidateConsentReceiptBundle().linked_trust_modules,
  pilot_labelled: true,
};

export function getCandidateConsentReceiptDemo(): CandidateConsentReceiptRecord {
  return DEMO_RECORD;
}
