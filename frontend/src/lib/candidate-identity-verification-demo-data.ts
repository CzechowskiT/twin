/** Deterministic candidate identity verification pilot — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_IDENTITY_VERIFICATION_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_IDENTITY_VERIFICATION_GENERATED_AT = "2026-06-18T16:00:00Z";
export const CANDIDATE_IDENTITY_VERIFICATION_BUNDLE_VERSION = "2026-06-18-identity-pilot-1";

export type IdentityVerificationStatus = "pilot_unavailable" | "not_started" | "in_review" | "provider_pending";

export type IdentityDataSharedField = {
  id: string;
  label: string;
  description: string;
  shared_on_pilot: false;
  category: "identity_signal" | "contact" | "document_metadata" | "provider_reference";
};

export type IdentityFlowStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "planned" | "not_live" | "preview_only" | "disabled";
};

export type IdentityDisabledAction = {
  id: string;
  label: string;
  reason: string;
  action_kind: "start" | "sync" | "consent" | "upload";
};

export type IdentityAuditEvent = {
  id: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type IdentityLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type CandidateIdentityVerificationMetadata = {
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
  provider_configured: false;
};

export type CandidateIdentityVerificationBundle = {
  request_metadata: CandidateIdentityVerificationMetadata;
  current_status: {
    status: IdentityVerificationStatus;
    status_note: string;
    provider_label: string;
    last_checked_at: string;
  };
  future_flow_steps: IdentityFlowStep[];
  data_shared_preview: IdentityDataSharedField[];
  disabled_actions: IdentityDisabledAction[];
  audit_timeline: IdentityAuditEvent[];
  linked_modules: IdentityLinkedModule[];
  safety_boundaries: {
    no_kyc: true;
    no_upload: true;
    no_provider_api: true;
    no_backend_write: true;
    human_decision_required: true;
    notes: string[];
  };
};

export type CandidateIdentityVerificationRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  verification_label: string;
  last_reviewed_at: string;
  bundle: CandidateIdentityVerificationBundle;
  pilot_labelled: true;
};

export function buildCandidateIdentityVerificationBundle(): CandidateIdentityVerificationBundle {
  const control = getCandidateControlCenterDemo();
  const candidateId = CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID;
  const roleId = CANDIDATE_IDENTITY_VERIFICATION_DEMO_ROLE_ID;

  return {
    request_metadata: {
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_IDENTITY_VERIFICATION_GENERATED_AT,
      bundle_version: CANDIDATE_IDENTITY_VERIFICATION_BUNDLE_VERSION,
      provider_configured: false,
    },
    current_status: {
      status: "pilot_unavailable",
      status_note:
        "Identity verification provider is not configured in this environment — preview only, no live checks.",
      provider_label: "Authologic (planned)",
      last_checked_at: CANDIDATE_IDENTITY_VERIFICATION_GENERATED_AT,
    },
    future_flow_steps: [
      {
        id: "flow-001",
        order: 1,
        title: "Review what is shared",
        description: "See which identity signals would be sent to the provider — pilot shows read-only preview.",
        status: "preview_only",
      },
      {
        id: "flow-002",
        order: 2,
        title: "Confirm provider processing consent",
        description: "Checkbox consent before leaving TWIN — disabled on pilot until provider is configured.",
        status: "disabled",
      },
      {
        id: "flow-003",
        order: 3,
        title: "Redirect to verification provider",
        description: "External identity check session — not live until environment credentials exist.",
        status: "not_live",
      },
      {
        id: "flow-004",
        order: 4,
        title: "Return and sync status",
        description: "TWIN stores verification status only — never document images or full provider payload.",
        status: "planned",
      },
      {
        id: "flow-005",
        order: 5,
        title: "Human review if needed",
        description: "Exception queue for disputes — not automatic profile mutation.",
        status: "planned",
      },
    ],
    data_shared_preview: [
      {
        id: "ds-001",
        label: "Verification status flag",
        description: "Boolean + timestamp — whether identity check completed.",
        shared_on_pilot: false,
        category: "identity_signal",
      },
      {
        id: "ds-002",
        label: "Provider conversation reference",
        description: "Opaque conversation ID for sync — no document bytes.",
        shared_on_pilot: false,
        category: "provider_reference",
      },
      {
        id: "ds-003",
        label: "Legal name match signal",
        description: "Match outcome summary — not raw ID scan on pilot.",
        shared_on_pilot: false,
        category: "identity_signal",
      },
      {
        id: "ds-004",
        label: "Document upload slot",
        description: "Placeholder only — upload disabled on pilot.",
        shared_on_pilot: false,
        category: "document_metadata",
      },
    ],
    disabled_actions: [
      {
        id: "act-001",
        label: "Start verification",
        reason: "Provider not configured in this environment.",
        action_kind: "start",
      },
      {
        id: "act-002",
        label: "Refresh status",
        reason: "No active verification conversation on pilot.",
        action_kind: "sync",
      },
      {
        id: "act-003",
        label: "Provider processing consent",
        reason: "Consent checkbox locked until pilot provider is live.",
        action_kind: "consent",
      },
      {
        id: "act-004",
        label: "Upload identity document",
        reason: "Document upload not available — preview workflow only.",
        action_kind: "upload",
      },
    ],
    audit_timeline: [
      ...control.audit_timeline
        .filter((e) => e.type === "consent_reviewed" || e.type === "visibility_reviewed")
        .map((e) => ({
          id: e.id,
          type: e.type,
          at: e.at,
          summary: e.summary,
          backend_write: false as const,
        })),
      {
        id: "aud-id-001",
        type: "identity_pilot_viewed",
        at: CANDIDATE_IDENTITY_VERIFICATION_GENERATED_AT,
        summary: "Identity verification pilot page opened — no provider API call.",
        backend_write: false as const,
      },
    ],
    linked_modules: [
      {
        id: "sor_trust_center",
        href: candidateTrustCenterHref(),
        label: "Candidate trust center",
        module_family: "trust",
      },
      {
        id: "sor_control_center",
        href: candidateControlCenterHref(),
        label: "Candidate control center",
        module_family: "trust",
      },
      {
        id: "sor_export_preview",
        href: candidateExportPreviewHref(),
        label: "Export preview bundle",
        module_family: "trust",
      },
      {
        id: "sor_corrections",
        href: candidateCorrectionRequestHref(),
        label: "Correction request",
        module_family: "trust",
      },
      {
        id: "sor_audit_export",
        href: candidateTrustAuditExportHref(),
        label: "Trust audit export",
        module_family: "trust",
      },
      {
        id: "sor_profile",
        href: CANDIDATE_CANONICAL_ROUTES.profile,
        label: "Profile workspace",
        module_family: "profile",
      },
      {
        id: "sor_identity_legacy",
        href: CANDIDATE_CANONICAL_ROUTES.identity,
        label: "Identity page (legacy route)",
        module_family: "profile",
      },
    ],
    safety_boundaries: {
      no_kyc: true,
      no_upload: true,
      no_provider_api: true,
      no_backend_write: true,
      human_decision_required: true,
      notes: [
        "Identity verification pilot is preview-only — no KYC, document upload, or provider API.",
        "No backend writes from this page — status events are deterministic demo samples.",
        "Human decision required before any verification outcome affects recruiter-visible trust signals.",
      ],
    },
  };
}

const DEMO_RECORD: CandidateIdentityVerificationRecord = {
  id: CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_IDENTITY_VERIFICATION_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  verification_label: "Identity verification pilot · demo-candidate-001",
  last_reviewed_at: CANDIDATE_IDENTITY_VERIFICATION_GENERATED_AT,
  bundle: buildCandidateIdentityVerificationBundle(),
  pilot_labelled: true,
};

export function getCandidateIdentityVerificationDemo(): CandidateIdentityVerificationRecord {
  return DEMO_RECORD;
}
