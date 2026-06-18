/** Deterministic candidate correction request workflow — demo-candidate-001, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_CORRECTION_REQUEST_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_CORRECTION_REQUEST_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_CORRECTION_REQUEST_GENERATED_AT = "2026-06-18T14:00:00Z";
export const CANDIDATE_CORRECTION_REQUEST_BUNDLE_VERSION = "2026-06-18-correction-preview-1";

export type CorrectionCategoryType =
  | "profile_field"
  | "skills_competency"
  | "experience_timeline"
  | "education_credential"
  | "visibility_scope"
  | "application_match_data";

export type CorrectionCategory = {
  id: string;
  type: CorrectionCategoryType;
  label: string;
  description: string;
  example_fields: string[];
  selectable: false;
};

export type CorrectionDraftField = {
  id: string;
  category_type: CorrectionCategoryType;
  field_label: string;
  current_value: string;
  proposed_value: string;
  rationale: string;
};

export type CorrectionEvidenceAttachment = {
  id: string;
  label: string;
  kind: "portfolio_link" | "certificate" | "reference_note" | "screenshot_placeholder";
  preview_note: string;
  uploadable: false;
};

export type CorrectionReviewCheckpoint = {
  id: string;
  label: string;
  status: "pending_preview" | "ready_preview" | "blocked_preview";
  note: string;
};

export type CorrectionAuditPreviewEvent = {
  id: string;
  type: string;
  at: string;
  summary: string;
  backend_write: false;
};

export type CorrectionLinkedModule = {
  id: string;
  href: string;
  label: string;
  module_family: string;
};

export type CorrectionPlannedWorkflowStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "planned" | "not_live" | "preview_only";
};

export type CandidateCorrectionRequestMetadata = {
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
};

export type CandidateCorrectionRequestBundle = {
  request_metadata: CandidateCorrectionRequestMetadata;
  categories: CorrectionCategory[];
  draft_fields: CorrectionDraftField[];
  evidence_attachments: CorrectionEvidenceAttachment[];
  review_checkpoints: CorrectionReviewCheckpoint[];
  audit_preview_events: CorrectionAuditPreviewEvent[];
  linked_modules: CorrectionLinkedModule[];
  planned_workflow: CorrectionPlannedWorkflowStep[];
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

export type CandidateCorrectionRequestRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  correction_label: string;
  last_reviewed_at: string;
  bundle: CandidateCorrectionRequestBundle;
  pilot_labelled: true;
};

const DEMO_CATEGORIES: CorrectionCategory[] = [
  {
    id: "cat-profile",
    type: "profile_field",
    label: "Profile field",
    description: "Headline, summary, or location preference shown on your workspace.",
    example_fields: ["Headline", "Location preference", "Role title"],
    selectable: false,
  },
  {
    id: "cat-skills",
    type: "skills_competency",
    label: "Skills & competency",
    description: "Primary stack, tools, or competency tags recruiters see after consent.",
    example_fields: ["Primary stack", "Frameworks", "Domain expertise"],
    selectable: false,
  },
  {
    id: "cat-experience",
    type: "experience_timeline",
    label: "Experience timeline",
    description: "Employment dates, titles, or project scope in your profile narrative.",
    example_fields: ["Job title", "Tenure dates", "Project scope"],
    selectable: false,
  },
  {
    id: "cat-education",
    type: "education_credential",
    label: "Education & credential",
    description: "Degrees, certifications, or training entries — evidence may be required.",
    example_fields: ["Degree", "Certification", "Training program"],
    selectable: false,
  },
  {
    id: "cat-visibility",
    type: "visibility_scope",
    label: "Visibility scope",
    description: "What recruiters see before you apply — not a live visibility toggle on pilot.",
    example_fields: ["Contact fields", "Match fit signal", "Application context"],
    selectable: false,
  },
  {
    id: "cat-app-match",
    type: "application_match_data",
    label: "Application & match data",
    description: "Fields shared or withheld on demo-role-001 application and match surfaces.",
    example_fields: ["Shared fields", "Withheld fields", "Fit summary"],
    selectable: false,
  },
];

export function buildCandidateCorrectionRequestBundle(): CandidateCorrectionRequestBundle {
  const control = getCandidateControlCenterDemo();
  const candidateId = CANDIDATE_CORRECTION_REQUEST_DEMO_ID;
  const roleId = CANDIDATE_CORRECTION_REQUEST_DEMO_ROLE_ID;

  const draftFields: CorrectionDraftField[] = control.correction_requests.map((req, index) => ({
    id: req.id,
    category_type: index === 0 ? "profile_field" : "skills_competency",
    field_label: req.field,
    current_value: req.current_value,
    proposed_value: req.suggested_correction,
    rationale: req.note,
  }));

  return {
    request_metadata: {
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_CORRECTION_REQUEST_GENERATED_AT,
      bundle_version: CANDIDATE_CORRECTION_REQUEST_BUNDLE_VERSION,
    },
    categories: DEMO_CATEGORIES,
    draft_fields: draftFields,
    evidence_attachments: [
      {
        id: "ev-001",
        label: "Portfolio — fintech case study",
        kind: "portfolio_link",
        preview_note: "Sample link placeholder — upload disabled on pilot.",
        uploadable: false,
      },
      {
        id: "ev-002",
        label: "AWS Solutions Architect — sample cert",
        kind: "certificate",
        preview_note: "Certificate preview slot — no file bytes stored.",
        uploadable: false,
      },
      {
        id: "ev-003",
        label: "Manager reference note",
        kind: "reference_note",
        preview_note: "Text reference excerpt — human review before sharing.",
        uploadable: false,
      },
    ],
    review_checkpoints: [
      {
        id: "chk-001",
        label: "Draft fields reviewed",
        status: "ready_preview",
        note: "Two sample corrections loaded from control center preview.",
      },
      {
        id: "chk-002",
        label: "Evidence attached",
        status: "pending_preview",
        note: "Attachments are preview placeholders — no upload on pilot.",
      },
      {
        id: "chk-003",
        label: "Recruiter impact acknowledged",
        status: "blocked_preview",
        note: "Human decision required before any profile change goes live.",
      },
    ],
    audit_preview_events: control.audit_timeline
      .filter((e) => e.type === "correction_preview_saved" || e.type === "visibility_reviewed")
      .map((e) => ({
        id: e.id,
        type: e.type,
        at: e.at,
        summary: e.summary,
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
        id: "sor_profile",
        href: CANDIDATE_CANONICAL_ROUTES.profile,
        label: "Profile workspace",
        module_family: "profile",
      },
      {
        id: "sor_profile_360",
        href: candidateProfile360Href(candidateId, "recruiter"),
        label: "Profile 360 (recruiter view)",
        module_family: "profile",
      },
      {
        id: "sor_decision_memory",
        href: decisionMemoryHref(candidateId, "recruiter"),
        label: "Decision memory",
        module_family: "audit",
      },
    ],
    planned_workflow: [
      {
        id: "wf-001",
        order: 1,
        title: "Select correction category",
        description: "Choose what kind of data you believe is inaccurate — pilot shows all six types.",
        status: "preview_only",
      },
      {
        id: "wf-002",
        order: 2,
        title: "Draft proposed values",
        description: "Enter current vs proposed values — saved locally on pilot, not submitted.",
        status: "preview_only",
      },
      {
        id: "wf-003",
        order: 3,
        title: "Attach supporting evidence",
        description: "Optional portfolio links or credentials — upload planned, not live.",
        status: "not_live",
      },
      {
        id: "wf-004",
        order: 4,
        title: "Review before sending",
        description: "Checklist confirms impact on recruiter-visible fields — submit disabled.",
        status: "preview_only",
      },
      {
        id: "wf-005",
        order: 5,
        title: "Human review queue",
        description: "TWIN team or recruiter reviews correction — no automatic profile mutation.",
        status: "planned",
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
        "Correction request workflow is preview-only — no backend submission on pilot.",
        "No support ticket or email is created from this page.",
        "Human decision required before any profile update goes live.",
      ],
    },
  };
}

const DEMO_RECORD: CandidateCorrectionRequestRecord = {
  id: CANDIDATE_CORRECTION_REQUEST_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_CORRECTION_REQUEST_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  correction_label: "Correction request preview · demo-candidate-001",
  last_reviewed_at: CANDIDATE_CORRECTION_REQUEST_GENERATED_AT,
  bundle: buildCandidateCorrectionRequestBundle(),
  pilot_labelled: true,
};

export function getCandidateCorrectionRequestDemo(): CandidateCorrectionRequestRecord {
  return DEMO_RECORD;
}
