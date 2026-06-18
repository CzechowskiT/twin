/** Deterministic candidate export preview bundle — demo-candidate-001, no PII, no backend writes. */

import { getCandidateControlCenterDemo } from "@/lib/candidate-control-center-demo-data";
import { getCandidateTrustCenterDemo } from "@/lib/candidate-trust-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export const CANDIDATE_EXPORT_PREVIEW_DEMO_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const CANDIDATE_EXPORT_PREVIEW_DEMO_ROLE_ID = JOB_PIPELINE_DEMO_ID;
export const CANDIDATE_EXPORT_PREVIEW_FILENAME = "twin-demo-candidate-001-export-preview.json";
export const CANDIDATE_EXPORT_PREVIEW_GENERATED_AT = "2026-06-18T12:00:00Z";
export const CANDIDATE_EXPORT_PREVIEW_BUNDLE_VERSION = "2026-06-18-preview-1";

export type CandidateExportPreviewMetadata = {
  backend_write: false;
  demo_only: true;
  legal_claim: false;
  candidate_id: string;
  role_id: string;
  generated_at: string;
  bundle_version: string;
  filename: string;
};

export type CandidateExportPreviewBundle = {
  export_metadata: CandidateExportPreviewMetadata;
  profile_summary: {
    display_name: string;
    headline: string;
    role_title: string;
    skills: string[];
    experience_years: number;
    location_preference: string;
  };
  preferences: {
    remote: boolean;
    salary_band: string;
    role_types: string[];
    notice_period: string;
  };
  applications_matches_visibility: {
    applications: Array<{
      id: string;
      role_id: string;
      role_title: string;
      status: string;
      shared_fields: string[];
      withheld_fields: string[];
    }>;
    matches: Array<{
      id: string;
      role_id: string;
      role_title: string;
      fit_summary: string;
      shared_fields: string[];
      withheld_fields: string[];
    }>;
  };
  trust_control_consent_snapshots: {
    visibility_controls: Array<{ id: string; label: string; current: string }>;
    consent_items: Array<{ id: string; purpose: string; status: string }>;
    trust_label: string;
    control_label: string;
  };
  communication_preferences: Array<{
    channel: string;
    status: string;
    note: string;
  }>;
  system_of_record_links: Array<{
    id: string;
    href: string;
    label: string;
    module_family: string;
  }>;
  decision_memory_refs: Array<{
    id: string;
    href: string;
    event_type: string;
    summary: string;
    at: string;
  }>;
  audit_preview_events: Array<{
    id: string;
    type: string;
    at: string;
    summary: string;
    backend_write: false;
  }>;
  safety_boundaries: {
    no_live_export: true;
    no_delete: true;
    no_revoke: true;
    no_outreach: true;
    no_ats_sync: true;
    human_decision_required: true;
    notes: string[];
  };
};

export type CandidateExportPreviewRecord = {
  id: string;
  display_name: string;
  headline: string;
  role_id: string;
  role_title: string;
  export_label: string;
  last_reviewed_at: string;
  bundle: CandidateExportPreviewBundle;
  included_sections: string[];
  excluded_sections: string[];
  pilot_labelled: true;
};

const DEMO_INCLUDED = [
  "Profile summary (sample)",
  "Preferences snapshot",
  "Application & match visibility",
  "Trust / control / consent snapshots",
  "Communication preferences",
  "System-of-record links",
  "Decision memory references",
  "Audit preview events",
  "Safety boundaries",
] as const;

const DEMO_EXCLUDED = [
  "Real email addresses or phone numbers",
  "Full CV file bytes",
  "Live ATS records",
  "Outbound email or outreach logs",
  "OAuth tokens or calendar credentials",
  "Payment or billing identifiers",
] as const;

export function buildCandidateExportPreviewBundle(): CandidateExportPreviewBundle {
  const control = getCandidateControlCenterDemo();
  const trust = getCandidateTrustCenterDemo();
  const candidateId = CANDIDATE_EXPORT_PREVIEW_DEMO_ID;
  const roleId = CANDIDATE_EXPORT_PREVIEW_DEMO_ROLE_ID;

  return {
    export_metadata: {
      backend_write: false,
      demo_only: true,
      legal_claim: false,
      candidate_id: candidateId,
      role_id: roleId,
      generated_at: CANDIDATE_EXPORT_PREVIEW_GENERATED_AT,
      bundle_version: CANDIDATE_EXPORT_PREVIEW_BUNDLE_VERSION,
      filename: CANDIDATE_EXPORT_PREVIEW_FILENAME,
    },
    profile_summary: {
      display_name: control.display_name,
      headline: control.headline,
      role_title: control.role_title,
      skills: ["TypeScript", "React", "FastAPI", "PostgreSQL", "Product discovery"],
      experience_years: 8,
      location_preference: "Remote EU · CET±2",
    },
    preferences: {
      remote: true,
      salary_band: "Sample band · review in profile",
      role_types: ["Staff / Senior IC", "Product engineering"],
      notice_period: "Pilot sample — not verified",
    },
    applications_matches_visibility: {
      applications: control.app_match_transparency
        .filter((item) => item.kind === "application")
        .map((item) => ({
          id: item.id,
          role_id: item.role_id,
          role_title: item.role_title,
          status: "submitted_preview",
          shared_fields: item.shared_fields,
          withheld_fields: item.withheld_fields,
        })),
      matches: control.app_match_transparency
        .filter((item) => item.kind === "match")
        .map((item) => ({
          id: item.id,
          role_id: item.role_id,
          role_title: item.role_title,
          fit_summary: "Pilot fit signal — human review before apply.",
          shared_fields: item.shared_fields,
          withheld_fields: item.withheld_fields,
        })),
    },
    trust_control_consent_snapshots: {
      visibility_controls: control.visibility_controls.map((v) => ({
        id: v.id,
        label: v.label,
        current: v.current,
      })),
      consent_items: control.consent_review_items.map((c) => ({
        id: c.id,
        purpose: c.purpose,
        status: c.status,
      })),
      trust_label: trust.trust_label,
      control_label: control.control_label,
    },
    communication_preferences: control.communication_preferences.map((p) => ({
      channel: p.channel,
      status: p.status,
      note: p.note,
    })),
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
        id: "sor_trust_recruiter",
        href: candidateTrustHref(candidateId, "recruiter"),
        label: "Candidate trust (recruiter view)",
        module_family: "trust",
      },
    ],
    decision_memory_refs: [
      {
        id: "dm-ref-001",
        href: decisionMemoryHref(candidateId, "recruiter"),
        event_type: "match_surfaced",
        summary: "Match surfaced for demo-role-001 — recruiter review queue.",
        at: "2026-06-08T10:00:00Z",
      },
      {
        id: "dm-ref-002",
        href: decisionMemoryHref(candidateId, "recruiter"),
        event_type: "application_reviewed",
        summary: "Application preview logged — no ATS write.",
        at: "2026-06-09T15:30:00Z",
      },
    ],
    audit_preview_events: control.audit_timeline.map((e) => ({
      id: e.id,
      type: e.type,
      at: e.at,
      summary: e.summary,
      backend_write: false as const,
    })),
    safety_boundaries: {
      no_live_export: true,
      no_delete: true,
      no_revoke: true,
      no_outreach: true,
      no_ats_sync: true,
      human_decision_required: true,
      notes: [
        "Preview bundle only — not a legal data portability export.",
        "No backend mutation when downloading this JSON.",
        "Human decision required on recruiter-facing actions.",
      ],
    },
  };
}

const DEMO_RECORD: CandidateExportPreviewRecord = {
  id: CANDIDATE_EXPORT_PREVIEW_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior product engineer · fintech · remote EU",
  role_id: CANDIDATE_EXPORT_PREVIEW_DEMO_ROLE_ID,
  role_title: "Senior Product Engineer",
  export_label: "Export preview bundle · demo-candidate-001",
  last_reviewed_at: "2026-06-18T12:00:00Z",
  bundle: buildCandidateExportPreviewBundle(),
  included_sections: [...DEMO_INCLUDED],
  excluded_sections: [...DEMO_EXCLUDED],
  pilot_labelled: true,
};

export function getCandidateExportPreviewDemo(): CandidateExportPreviewRecord {
  return DEMO_RECORD;
}
