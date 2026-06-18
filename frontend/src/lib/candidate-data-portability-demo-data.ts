/** Deterministic candidate data portability request — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_DATA_PORTABILITY_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_DATA_PORTABILITY_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_DATA_PORTABILITY_GENERATED_AT = "2026-06-18T16:00:00Z";
export const CANDIDATE_DATA_PORTABILITY_BUNDLE_VERSION = "2026-06-18-portability-preview-1";

export type PortabilityScopeArea = {
  id: string;
  label: string;
  description: string;
  coverage: "included_preview" | "excluded_preview" | "partial_preview";
};

export type PortabilityChecklistItem = {
  id: string;
  label: string;
  note: string;
};

export type PortabilityDraftField = {
  id: string;
  field_label: string;
  preview_value: string;
  note: string;
};

export type PortabilityAuditPreviewEvent = {
  id: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type PortabilityLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type PortabilityPlannedWorkflowStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "planned" | "not_live" | "preview_only";
};

export type CandidateDataPortabilityMetadata = {
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  request_type: "portability_preview";
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
};

export type CandidateDataPortabilityDraft = {
  request_type: "portability_preview";
  backend_write: false;
  delivery_format: string;
  note: string;
  fields: PortabilityDraftField[];
};

export type CandidateDataPortabilityBundle = {
  request_metadata: CandidateDataPortabilityMetadata;
  portability_scope: PortabilityScopeArea[];
  included_checklist: PortabilityChecklistItem[];
  excluded_checklist: PortabilityChecklistItem[];
  draft_request: CandidateDataPortabilityDraft;
  audit_preview_events: PortabilityAuditPreviewEvent[];
  linked_modules: PortabilityLinkedModule[];
  planned_workflow: PortabilityPlannedWorkflowStep[];
  safety_boundaries: {
    no_submit: true;
    no_ticket: true;
    no_email: true;
    no_delete: true;
    no_revoke: true;
    no_outreach: true;
    human_decision_required: true;
    notes: string[];
  };
};

export type CandidateDataPortabilityRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  portability_label: string;
  last_reviewed_at: string;
  bundle: CandidateDataPortabilityBundle;
  included_items: string[];
  excluded_items: string[];
  pilot_labelled: true;
};

const DEMO_SCOPE: PortabilityScopeArea[] = [
  {
    id: "scope-profile",
    label: "Profile & preferences",
    description: "Headline, skills, location preference, and role-type preferences from your workspace.",
    coverage: "included_preview",
  },
  {
    id: "scope-applications",
    label: "Applications & matches",
    description: "Shared and withheld fields for demo-role-001 application and match surfaces.",
    coverage: "partial_preview",
  },
  {
    id: "scope-trust",
    label: "Trust, control & consent",
    description: "Visibility controls, consent snapshots, and audit preview events — read-only context.",
    coverage: "included_preview",
  },
  {
    id: "scope-integrations",
    label: "Integrations & credentials",
    description: "OAuth tokens, calendar credentials, and live ATS sync records.",
    coverage: "excluded_preview",
  },
];

const DEMO_INCLUDED: PortabilityChecklistItem[] = [
  {
    id: "inc-001",
    label: "Profile summary (sample)",
    note: "Display name, headline, skills — no raw CV bytes.",
  },
  {
    id: "inc-002",
    label: "Preferences snapshot",
    note: "Remote, salary band, notice period — pilot sample values.",
  },
  {
    id: "inc-003",
    label: "Application visibility (demo-role-001)",
    note: "Shared and withheld field lists for your pilot application.",
  },
  {
    id: "inc-004",
    label: "Trust & consent snapshots",
    note: "Visibility controls and consent review items from control center.",
  },
  {
    id: "inc-005",
    label: "Audit preview events",
    note: "Deterministic timeline — backend_write false on every event.",
  },
];

const DEMO_EXCLUDED: PortabilityChecklistItem[] = [
  {
    id: "exc-001",
    label: "Real email addresses or phone numbers",
    note: "Contact PII excluded from portability preview bundle.",
  },
  {
    id: "exc-002",
    label: "Full CV file bytes",
    note: "Binary documents not included — metadata references only.",
  },
  {
    id: "exc-003",
    label: "OAuth tokens & calendar credentials",
    note: "Integration secrets never exported in preview mode.",
  },
  {
    id: "exc-004",
    label: "Live ATS records",
    note: "No employer-side ATS sync on pilot — excluded by design.",
  },
  {
    id: "exc-005",
    label: "Outbound email or outreach logs",
    note: "No outreach channel data in portability preview.",
  },
];

export function buildCandidateDataPortabilityBundle(): CandidateDataPortabilityBundle {
  const control = getCandidateControlCenterDemo();
  const candidateId = CANDIDATE_DATA_PORTABILITY_DEMO_ID;
  const roleId = CANDIDATE_DATA_PORTABILITY_DEMO_ROLE_ID;

  const draftFields: PortabilityDraftField[] = [
    {
      id: "draft-001",
      field_label: "Delivery format",
      preview_value: "Structured JSON bundle (demo preview)",
      note: "Machine-readable export — not a live delivery on pilot.",
    },
    {
      id: "draft-002",
      field_label: "Scope acknowledgement",
      preview_value: "Included and excluded checklists reviewed",
      note: "Candidate confirms scope before any future submission.",
    },
    {
      id: "draft-003",
      field_label: "Role context",
      preview_value: `${control.role_title} (${roleId})`,
      note: "Portability scope tied to pilot role context.",
    },
  ];

  return {
    request_metadata: {
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      request_type: "portability_preview",
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_DATA_PORTABILITY_GENERATED_AT,
      bundle_version: CANDIDATE_DATA_PORTABILITY_BUNDLE_VERSION,
    },
    portability_scope: DEMO_SCOPE,
    included_checklist: DEMO_INCLUDED,
    excluded_checklist: DEMO_EXCLUDED,
    draft_request: {
      request_type: "portability_preview",
      backend_write: false,
      delivery_format: "JSON bundle preview",
      note: "Preview-only draft — submit disabled, no backend write.",
      fields: draftFields,
    },
    audit_preview_events: control.audit_timeline
      .filter((e) => e.type === "export_preview_opened" || e.type === "correction_preview_saved")
      .map((e) => ({
        id: `port-${e.id}`,
        type: "portability_preview_context",
        at: e.at,
        summary: `Portability context from ${e.type}: ${e.summary}`,
        backend_write: false as const,
      })),
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
        id: "sor_correction_request",
        href: candidateCorrectionRequestHref(),
        label: "Correction request workflow",
        module_family: "trust",
      },
      {
        id: "sor_profile_360",
        href: candidateProfile360Href(candidateId),
        label: "Profile 360",
        module_family: "profile",
      },
      {
        id: "sor_panel",
        href: CANDIDATE_CANONICAL_ROUTES.panel,
        label: "Candidate dashboard",
        module_family: "workspace",
      },
    ],
    planned_workflow: [
      {
        id: "wf-001",
        order: 1,
        title: "Scope review",
        description: "Candidate reviews included and excluded data categories.",
        status: "preview_only",
      },
      {
        id: "wf-002",
        order: 2,
        title: "Identity verification",
        description: "Confirm account ownership before any live export.",
        status: "not_live",
      },
      {
        id: "wf-003",
        order: 3,
        title: "Bundle assembly",
        description: "System assembles machine-readable export from SOR modules.",
        status: "planned",
      },
      {
        id: "wf-004",
        order: 4,
        title: "Secure delivery",
        description: "Download link or encrypted transfer — human decision gate.",
        status: "not_live",
      },
    ],
    safety_boundaries: {
      no_submit: true,
      no_ticket: true,
      no_email: true,
      no_delete: true,
      no_revoke: true,
      no_outreach: true,
      human_decision_required: true,
      notes: [
        "Portability preview only — no live export or backend mutation.",
        "Submit disabled on pilot — no ticket or email triggered.",
      ],
    },
  };
}

export function getCandidateDataPortabilityDemo(): CandidateDataPortabilityRecord {
  const control = getCandidateControlCenterDemo();
  const bundle = buildCandidateDataPortabilityBundle();

  return {
    id: CANDIDATE_DATA_PORTABILITY_DEMO_ID,
    display_name: control.display_name,
    headline: control.headline,
    role_id: control.role_id,
    role_title: control.role_title,
    portability_label: "Data portability request preview — demo-only",
    last_reviewed_at: CANDIDATE_DATA_PORTABILITY_GENERATED_AT,
    bundle,
    included_items: bundle.included_checklist.map((item) => item.label),
    excluded_items: bundle.excluded_checklist.map((item) => item.label),
    pilot_labelled: true,
  };
}
