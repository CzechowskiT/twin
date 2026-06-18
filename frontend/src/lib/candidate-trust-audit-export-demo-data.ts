/** Deterministic candidate trust audit export bundle — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { getCandidateTrustCenterDemo } from "@/lib/candidate-trust-center-demo-data";
import { buildCandidateExportPreviewBundle } from "@/lib/candidate-export-preview-demo-data";
import { buildCandidateCorrectionRequestBundle } from "@/lib/candidate-correction-request-demo-data";
import { buildCandidateDataPortabilityBundle } from "@/lib/candidate-data-portability-demo-data";
import { buildCandidateRevokeDeleteBundle } from "@/lib/candidate-revoke-delete-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME =
  "twin-demo-candidate-001-trust-audit-export-preview.json";
export const CANDIDATE_TRUST_AUDIT_EXPORT_GENERATED_AT = "2026-06-18T20:00:00Z";
export const CANDIDATE_TRUST_AUDIT_EXPORT_BUNDLE_VERSION = "2026-06-18-trust-audit-preview-1";

export type TrustAuditExportEvent = {
  id: string;
  workflow: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type TrustAuditExportEvidenceRef = {
  id: string;
  href: string;
  kind: string;
  summary: string;
  at: string;
};

export type TrustAuditExportLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type CandidateTrustAuditExportMetadata = {
  trust_audit_preview: true;
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

export type CandidateTrustAuditExportBundle = {
  export_metadata: CandidateTrustAuditExportMetadata;
  trust_center_events: TrustAuditExportEvent[];
  control_center_events: TrustAuditExportEvent[];
  export_preview_events: TrustAuditExportEvent[];
  correction_request_events: TrustAuditExportEvent[];
  portability_request_events: TrustAuditExportEvent[];
  revoke_delete_events: TrustAuditExportEvent[];
  system_of_record_links: TrustAuditExportLinkedModule[];
  evidence_references: TrustAuditExportEvidenceRef[];
  included_scope: string[];
  excluded_scope: string[];
  safety_boundaries: {
    no_live_export: true;
    no_delete: true;
    no_revoke: true;
    no_outreach: true;
    no_ats_sync: true;
    no_ticket: true;
    no_email: true;
    human_decision_required: true;
    notes: string[];
  };
};

export type CandidateTrustAuditExportRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  export_label: string;
  last_reviewed_at: string;
  bundle: CandidateTrustAuditExportBundle;
  linked_modules: TrustAuditExportLinkedModule[];
  pilot_labelled: true;
};

const DEMO_INCLUDED = [
  "Trust center timeline events",
  "Control center audit events",
  "Export preview audit events",
  "Correction request audit events",
  "Data portability audit events",
  "Revoke & delete audit events",
  "System-of-record links",
  "Evidence references",
  "Safety boundaries",
] as const;

const DEMO_EXCLUDED = [
  "Real email addresses or phone numbers",
  "Live ATS mutation logs",
  "Outbound email or outreach records",
  "OAuth tokens or calendar credentials",
  "Submitted tickets or backend requests",
  "Legal data portability claims",
] as const;

function mapControlEvents(workflow: string, events: Array<{ id: string; type: string; at: string; summary: string }>) {
  return events.map((e) => ({
    id: e.id,
    workflow,
    type: e.type,
    at: e.at,
    summary: e.summary,
    backend_write: false as const,
  }));
}

export function buildCandidateTrustAuditExportBundle(): CandidateTrustAuditExportBundle {
  const control = getCandidateControlCenterDemo();
  const trust = getCandidateTrustCenterDemo();
  const exportPreview = buildCandidateExportPreviewBundle();
  const correction = buildCandidateCorrectionRequestBundle();
  const portability = buildCandidateDataPortabilityBundle();
  const revokeDelete = buildCandidateRevokeDeleteBundle();
  const candidateId = CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID;
  const roleId = CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ROLE_ID;

  const trustCenterEvents = trust.trust_timeline.map((e) => ({
    id: e.id,
    workflow: "trust_center",
    type: e.type,
    at: e.at,
    summary: e.summary,
    backend_write: false as const,
  }));

  const controlCenterEvents = mapControlEvents("control_center", control.audit_timeline);

  return {
    export_metadata: {
      trust_audit_preview: true,
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      generated_locally: true,
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_TRUST_AUDIT_EXPORT_GENERATED_AT,
      bundle_version: CANDIDATE_TRUST_AUDIT_EXPORT_BUNDLE_VERSION,
      filename: CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME,
    },
    trust_center_events: trustCenterEvents,
    control_center_events: controlCenterEvents,
    export_preview_events: mapControlEvents("export_preview", exportPreview.audit_preview_events),
    correction_request_events: mapControlEvents("correction_request", correction.audit_preview_events),
    portability_request_events: mapControlEvents("portability_request", portability.audit_preview_events),
    revoke_delete_events: mapControlEvents("revoke_delete", revokeDelete.audit_preview_events),
    system_of_record_links: [
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
        label: "Export preview",
        module_family: "trust",
      },
      {
        id: "sor_corrections",
        href: candidateCorrectionRequestHref(),
        label: "Correction request",
        module_family: "trust",
      },
      {
        id: "sor_portability",
        href: candidateDataPortabilityHref(),
        label: "Data portability",
        module_family: "trust",
      },
      {
        id: "sor_revoke_delete",
        href: candidateRevokeDeleteHref(),
        label: "Revoke & delete",
        module_family: "trust",
      },
      {
        id: "sor_audit_export",
        href: CANDIDATE_CANONICAL_ROUTES.trustAuditExport,
        label: "Trust audit export",
        module_family: "trust",
      },
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
    ],
    evidence_references: [
      {
        id: "ev-ref-001",
        href: decisionMemoryHref(candidateId, "recruiter"),
        kind: "decision_memory",
        summary: "Match surfaced for demo-role-001 — recruiter review queue.",
        at: "2026-06-08T10:00:00Z",
      },
      {
        id: "ev-ref-002",
        href: candidateProfile360Href(candidateId, "recruiter"),
        kind: "profile_360",
        summary: "Profile 360 recruiter view — sample evidence link, no PII.",
        at: "2026-06-09T11:00:00Z",
      },
      {
        id: "ev-ref-003",
        href: candidateControlCenterHref(),
        kind: "control_center_audit",
        summary: "Control center visibility change preview — no backend write.",
        at: "2026-06-10T14:30:00Z",
      },
    ],
    included_scope: [...DEMO_INCLUDED],
    excluded_scope: [...DEMO_EXCLUDED],
    safety_boundaries: {
      no_live_export: true,
      no_delete: true,
      no_revoke: true,
      no_outreach: true,
      no_ats_sync: true,
      no_ticket: true,
      no_email: true,
      human_decision_required: true,
      notes: [
        "Trust audit export preview only — not a legal audit certificate.",
        "JSON generated locally in the browser — no backend mutation.",
        "Human decision required on recruiter-facing actions.",
      ],
    },
  };
}

const DEMO_LINKED_MODULES = buildCandidateTrustAuditExportBundle().system_of_record_links;

const DEMO_RECORD: CandidateTrustAuditExportRecord = {
  id: CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  export_label: "Trust audit export bundle · demo-candidate-001",
  last_reviewed_at: "2026-06-18T20:00:00Z",
  bundle: buildCandidateTrustAuditExportBundle(),
  linked_modules: DEMO_LINKED_MODULES,
  pilot_labelled: true,
};

export function getCandidateTrustAuditExportDemo(): CandidateTrustAuditExportRecord {
  return DEMO_RECORD;
}
