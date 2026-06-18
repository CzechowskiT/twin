/** Deterministic candidate revoke & delete request — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_REVOKE_DELETE_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_REVOKE_DELETE_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_REVOKE_DELETE_GENERATED_AT = "2026-06-18T18:00:00Z";
export const CANDIDATE_REVOKE_DELETE_BUNDLE_VERSION = "2026-06-18-revoke-delete-preview-1";

export type RevokeDeleteRequestTypeId =
  | "revoke_consent_preview"
  | "delete_account_preview"
  | "revoke_and_delete_preview"
  | "pause_automation_preview"
  | "remove_public_profile_preview";

export type RevokeDeleteRequestTypeOption = {
  id: RevokeDeleteRequestTypeId;
  label: string;
  description: string;
  selected_preview: boolean;
  disabled: true;
};

export type RevokeDeleteImpactArea = {
  id: string;
  label: string;
  description: string;
  severity: "informational" | "moderate_preview" | "high_preview";
};

export type RevokeDeleteScopeItem = {
  id: string;
  label: string;
  note: string;
  scope: "included_preview" | "excluded_preview";
};

export type RevokeDeleteDraftField = {
  id: string;
  field_label: string;
  preview_value: string;
  note: string;
};

export type RevokeDeleteAuditPreviewEvent = {
  id: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type RevokeDeleteLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type RevokeDeletePlannedWorkflowStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "planned" | "not_live" | "preview_only";
};

export type CandidateRevokeDeleteMetadata = {
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  request_type: "revoke_delete_preview";
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
};

export type CandidateRevokeDeleteDraft = {
  request_type: "revoke_delete_preview";
  backend_write: false;
  confirmation_note: string;
  note: string;
  fields: RevokeDeleteDraftField[];
};

export type CandidateRevokeDeleteBundle = {
  request_metadata: CandidateRevokeDeleteMetadata;
  request_type_options: RevokeDeleteRequestTypeOption[];
  impact_preview: RevokeDeleteImpactArea[];
  scope_items: RevokeDeleteScopeItem[];
  draft_request: CandidateRevokeDeleteDraft;
  audit_preview_events: RevokeDeleteAuditPreviewEvent[];
  linked_modules: RevokeDeleteLinkedModule[];
  planned_workflow: RevokeDeletePlannedWorkflowStep[];
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

export type CandidateRevokeDeleteRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  revoke_delete_label: string;
  last_reviewed_at: string;
  bundle: CandidateRevokeDeleteBundle;
  included_items: string[];
  excluded_items: string[];
  pilot_labelled: true;
};

const DEMO_REQUEST_TYPES: RevokeDeleteRequestTypeOption[] = [
  {
    id: "revoke_consent_preview",
    label: "Revoke consent (preview)",
    description: "Withdraw sharing consent for demo-role-001 — preview only, no live revoke.",
    selected_preview: true,
    disabled: true,
  },
  {
    id: "delete_account_preview",
    label: "Delete account (preview)",
    description: "Simulate account deletion scope — no account removal on pilot.",
    selected_preview: false,
    disabled: true,
  },
  {
    id: "revoke_and_delete_preview",
    label: "Revoke & delete (preview)",
    description: "Combined consent withdrawal and account closure preview.",
    selected_preview: false,
    disabled: true,
  },
  {
    id: "pause_automation_preview",
    label: "Pause automation (preview)",
    description: "Stop auto-apply and async matching — preview impact only.",
    selected_preview: false,
    disabled: true,
  },
  {
    id: "remove_public_profile_preview",
    label: "Remove public profile (preview)",
    description: "Hide profile from recruiter surfaces — preview scope, no live change.",
    selected_preview: false,
    disabled: true,
  },
];

const DEMO_IMPACT: RevokeDeleteImpactArea[] = [
  {
    id: "impact-matches",
    label: "Active matches & pipeline",
    description: "demo-role-001 match cards would move to archived preview state — not executed.",
    severity: "moderate_preview",
  },
  {
    id: "impact-calendar",
    label: "Interview holds & calendar",
    description: "Scheduled holds remain visible in preview — no calendar writes.",
    severity: "informational",
  },
  {
    id: "impact-consent",
    label: "Consent & visibility controls",
    description: "Control center consent items shown as would-be revoked — read-only context.",
    severity: "high_preview",
  },
  {
    id: "impact-integrations",
    label: "OAuth & integrations",
    description: "Connected calendar tokens listed as would disconnect — excluded from live action.",
    severity: "high_preview",
  },
];

const DEMO_SCOPE: RevokeDeleteScopeItem[] = [
  {
    id: "scope-inc-001",
    label: "Profile & preferences snapshot",
    note: "Display name, headline, skills — metadata only in preview bundle.",
    scope: "included_preview",
  },
  {
    id: "scope-inc-002",
    label: "Consent review items",
    note: "Purpose labels from control center — no live consent mutation.",
    scope: "included_preview",
  },
  {
    id: "scope-inc-003",
    label: "Application visibility (demo-role-001)",
    note: "Shared and withheld field lists for pilot application context.",
    scope: "included_preview",
  },
  {
    id: "scope-inc-004",
    label: "Audit preview events",
    note: "Deterministic timeline — backend_write false on every event.",
    scope: "included_preview",
  },
  {
    id: "scope-exc-001",
    label: "Live OAuth tokens & credentials",
    note: "Integration secrets never touched in preview mode.",
    scope: "excluded_preview",
  },
  {
    id: "scope-exc-002",
    label: "Employer-side ATS records",
    note: "No recruiter ATS sync on pilot — excluded by design.",
    scope: "excluded_preview",
  },
  {
    id: "scope-exc-003",
    label: "Outbound email or outreach logs",
    note: "No outreach channel data in revoke/delete preview.",
    scope: "excluded_preview",
  },
  {
    id: "scope-exc-004",
    label: "Binary CV file bytes",
    note: "Document binaries not included — metadata references only.",
    scope: "excluded_preview",
  },
];

export function buildCandidateRevokeDeleteBundle(): CandidateRevokeDeleteBundle {
  const control = getCandidateControlCenterDemo();
  const candidateId = CANDIDATE_REVOKE_DELETE_DEMO_ID;
  const roleId = CANDIDATE_REVOKE_DELETE_DEMO_ROLE_ID;

  const draftFields: RevokeDeleteDraftField[] = [
    {
      id: "draft-001",
      field_label: "Selected request type (preview)",
      preview_value: "revoke_consent_preview",
      note: "Request type selector disabled on pilot — sample value only.",
    },
    {
      id: "draft-002",
      field_label: "Impact acknowledgement",
      preview_value: "Impact areas reviewed — no live action",
      note: "Candidate confirms impact preview before any future submission.",
    },
    {
      id: "draft-003",
      field_label: "Role context",
      preview_value: `${control.role_title} (${roleId})`,
      note: "Revoke/delete scope tied to pilot role context.",
    },
  ];

  return {
    request_metadata: {
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      request_type: "revoke_delete_preview",
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_REVOKE_DELETE_GENERATED_AT,
      bundle_version: CANDIDATE_REVOKE_DELETE_BUNDLE_VERSION,
    },
    request_type_options: DEMO_REQUEST_TYPES,
    impact_preview: DEMO_IMPACT,
    scope_items: DEMO_SCOPE,
    draft_request: {
      request_type: "revoke_delete_preview",
      backend_write: false,
      confirmation_note: "I understand this is a preview-only draft",
      note: "Preview-only draft — submit disabled, no backend write.",
      fields: draftFields,
    },
    audit_preview_events: control.audit_timeline
      .filter((e) => e.type === "export_preview_opened" || e.type === "correction_preview_saved")
      .map((e) => ({
        id: `revoke-${e.id}`,
        type: "revoke_delete_preview_context",
        at: e.at,
        summary: `Revoke/delete context from ${e.type}: ${e.summary}`,
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
        id: "sor_data_portability",
        href: candidateDataPortabilityHref(),
        label: "Data portability request",
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
        title: "Request type & impact review",
        description: "Candidate selects request type and reviews impact preview areas.",
        status: "preview_only",
      },
      {
        id: "wf-002",
        order: 2,
        title: "Identity verification",
        description: "Confirm account ownership before any live revoke or delete.",
        status: "not_live",
      },
      {
        id: "wf-003",
        order: 3,
        title: "Cooling-off period",
        description: "Mandatory wait window before irreversible actions — human decision gate.",
        status: "planned",
      },
      {
        id: "wf-004",
        order: 4,
        title: "Execution & confirmation",
        description: "System processes revoke/delete with audit trail — not live on pilot.",
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
        "Revoke/delete preview only — no live account removal or consent mutation.",
        "Submit disabled on pilot — no ticket or email triggered.",
      ],
    },
  };
}

export function getCandidateRevokeDeleteDemo(): CandidateRevokeDeleteRecord {
  const control = getCandidateControlCenterDemo();
  const bundle = buildCandidateRevokeDeleteBundle();

  return {
    id: CANDIDATE_REVOKE_DELETE_DEMO_ID,
    display_name: control.display_name,
    headline: control.headline,
    role_id: control.role_id,
    role_title: control.role_title,
    revoke_delete_label: "Revoke & delete request preview — demo-only",
    last_reviewed_at: CANDIDATE_REVOKE_DELETE_GENERATED_AT,
    bundle,
    included_items: bundle.scope_items.filter((i) => i.scope === "included_preview").map((i) => i.label),
    excluded_items: bundle.scope_items.filter((i) => i.scope === "excluded_preview").map((i) => i.label),
    pilot_labelled: true,
  };
}
