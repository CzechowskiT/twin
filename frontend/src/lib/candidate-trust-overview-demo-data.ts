/** Candidate trust overview — deterministic demo index for all trust modules. */

import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_TRUST_OVERVIEW_DEMO_ID = "demo-candidate-001";

export type TrustOverviewModuleStatus = "pilot" | "live" | "not_live";

export type TrustOverviewModule = {
  id: string;
  href: string;
  label_key: string;
  status: TrustOverviewModuleStatus;
  summary_key: string;
};

export type TrustOverviewTimelineEvent = {
  id: string;
  at: string;
  module_id: string;
  summary_key: string;
};

export type TrustOverviewDownloadable = {
  id: string;
  module_id: string;
  label_key: string;
  format: "json";
  backend_write: false;
};

export type TrustOverviewPendingAction = {
  id: string;
  module_id: string;
  label_key: string;
  status: "preview" | "planned" | "review_required";
};

export type CandidateTrustOverviewRecord = {
  id: string;
  display_name: string;
  role_title: string;
  role_id: string;
  headline: string;
  pilot_labelled: boolean;
  last_reviewed_at: string;
  trust_modules: TrustOverviewModule[];
  timeline: TrustOverviewTimelineEvent[];
  downloadable_records: TrustOverviewDownloadable[];
  pending_actions: TrustOverviewPendingAction[];
  safety_boundaries: readonly string[];
  recommended_next_action_key: string;
  recommended_next_href: string;
};

const TRUST_MODULES: TrustOverviewModule[] = [
  {
    id: "trust_center",
    href: CANDIDATE_CANONICAL_ROUTES.trust,
    label_key: "candidateTrustOverview.moduleTrustCenter",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleTrustCenterSummary",
  },
  {
    id: "control_center",
    href: CANDIDATE_CANONICAL_ROUTES.trustControls,
    label_key: "candidateTrustOverview.moduleControlCenter",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleControlCenterSummary",
  },
  {
    id: "identity_verification",
    href: CANDIDATE_CANONICAL_ROUTES.trustIdentityVerification,
    label_key: "candidateTrustOverview.moduleIdentityVerification",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleIdentityVerificationSummary",
  },
  {
    id: "export_preview",
    href: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
    label_key: "candidateTrustOverview.moduleExportPreview",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleExportPreviewSummary",
  },
  {
    id: "correction_request",
    href: CANDIDATE_CANONICAL_ROUTES.trustCorrections,
    label_key: "candidateTrustOverview.moduleCorrectionRequest",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleCorrectionRequestSummary",
  },
  {
    id: "data_portability",
    href: CANDIDATE_CANONICAL_ROUTES.trustPortability,
    label_key: "candidateTrustOverview.moduleDataPortability",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleDataPortabilitySummary",
  },
  {
    id: "revoke_delete",
    href: CANDIDATE_CANONICAL_ROUTES.trustRevokeDelete,
    label_key: "candidateTrustOverview.moduleRevokeDelete",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleRevokeDeleteSummary",
  },
  {
    id: "trust_audit_export",
    href: CANDIDATE_CANONICAL_ROUTES.trustAuditExport,
    label_key: "candidateTrustOverview.moduleTrustAuditExport",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleTrustAuditExportSummary",
  },
  {
    id: "consent_receipt",
    href: CANDIDATE_CANONICAL_ROUTES.trustConsentReceipt,
    label_key: "candidateTrustOverview.moduleConsentReceipt",
    status: "pilot",
    summary_key: "candidateTrustOverview.moduleConsentReceiptSummary",
  },
];

export function getCandidateTrustOverviewDemo(): CandidateTrustOverviewRecord {
  return {
    id: CANDIDATE_TRUST_OVERVIEW_DEMO_ID,
    display_name: "Demo Candidate 001",
    role_title: "Senior Product Engineer (demo role)",
    role_id: JOB_PIPELINE_DEMO_ID,
    headline: "Trust & control overview — all pilot modules in one index",
    pilot_labelled: true,
    last_reviewed_at: "2026-06-18T10:00:00.000Z",
    trust_modules: TRUST_MODULES,
    timeline: [
      {
        id: "tl-trust-center",
        at: "2026-06-17T09:00:00.000Z",
        module_id: "trust_center",
        summary_key: "candidateTrustOverview.timelineTrustCenter",
      },
      {
        id: "tl-control-center",
        at: "2026-06-17T11:00:00.000Z",
        module_id: "control_center",
        summary_key: "candidateTrustOverview.timelineControlCenter",
      },
      {
        id: "tl-export-preview",
        at: "2026-06-18T08:00:00.000Z",
        module_id: "export_preview",
        summary_key: "candidateTrustOverview.timelineExportPreview",
      },
      {
        id: "tl-audit-export",
        at: "2026-06-18T09:30:00.000Z",
        module_id: "trust_audit_export",
        summary_key: "candidateTrustOverview.timelineAuditExport",
      },
      {
        id: "tl-consent-receipt",
        at: "2026-06-18T10:00:00.000Z",
        module_id: "consent_receipt",
        summary_key: "candidateTrustOverview.timelineConsentReceipt",
      },
    ],
    downloadable_records: [
      {
        id: "dl-export-preview",
        module_id: "export_preview",
        label_key: "candidateTrustOverview.downloadExportPreview",
        format: "json",
        backend_write: false,
      },
      {
        id: "dl-audit-export",
        module_id: "trust_audit_export",
        label_key: "candidateTrustOverview.downloadAuditExport",
        format: "json",
        backend_write: false,
      },
      {
        id: "dl-consent-receipt",
        module_id: "consent_receipt",
        label_key: "candidateTrustOverview.downloadConsentReceipt",
        format: "json",
        backend_write: false,
      },
    ],
    pending_actions: [
      {
        id: "pa-correction",
        module_id: "correction_request",
        label_key: "candidateTrustOverview.pendingCorrection",
        status: "preview",
      },
      {
        id: "pa-portability",
        module_id: "data_portability",
        label_key: "candidateTrustOverview.pendingPortability",
        status: "preview",
      },
      {
        id: "pa-revoke",
        module_id: "revoke_delete",
        label_key: "candidateTrustOverview.pendingRevokeDelete",
        status: "review_required",
      },
      {
        id: "pa-identity",
        module_id: "identity_verification",
        label_key: "candidateTrustOverview.pendingIdentity",
        status: "planned",
      },
    ],
    safety_boundaries: [
      "candidateTrustOverview.boundaryDemoOnly",
      "candidateTrustOverview.boundaryNoBackendWrite",
      "candidateTrustOverview.boundaryNoLegalClaim",
      "candidateTrustOverview.boundaryNoOutreach",
      "candidateTrustOverview.boundaryNoAtsWriteback",
      "candidateTrustOverview.boundaryHumanReview",
    ],
    recommended_next_action_key: "candidateTrustOverview.recommendedControlCenter",
    recommended_next_href: CANDIDATE_CANONICAL_ROUTES.trustControls,
  };
}
