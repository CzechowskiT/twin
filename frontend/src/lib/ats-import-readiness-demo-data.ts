/** Deterministic ATS Import Readiness — mapping/review only, no live sync or PII. */

import { CANDIDATE_PROFILE_360_DEMO_ID } from "@/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";
import { TWIN_DEMO_ATS_IMPORT_ID } from "@/lib/system-of-record-domain/constants";

export const ATS_IMPORT_READINESS_DEMO_CONNECTOR = TWIN_DEMO_ATS_IMPORT_ID;
export const ATS_IMPORT_SAMPLE_CANDIDATE_ID = CANDIDATE_PROFILE_360_DEMO_ID;
export const ATS_IMPORT_SAMPLE_ROLE_ID = JOB_PIPELINE_DEMO_ID;

export type ConnectorReadinessStatus = "mapping_ready_not_live" | "planned" | "pilot_ready";

export type AtsConnectorRow = {
  id: string;
  name: string;
  status: ConnectorReadinessStatus;
  note: string;
};

export type FieldMappingRow = {
  ats_field: string;
  twin_field: string;
  transform: string;
  review_required: boolean;
};

export type DedupeRuleRow = {
  id: string;
  strategy: string;
  signal: string;
  demo_match: string;
  review_required: true;
};

export type ConsentMappingRow = {
  ats_signal: string;
  twin_field: string;
  privacy_review_required: true;
  note: string;
};

export type ImportChecklistItem = {
  id: string;
  label_key: string;
  status: "pending_review" | "mapped" | "blocked";
};

export type ImportRiskFlag = {
  id: string;
  severity: "info" | "warning" | "review";
  summary: string;
};

export type ImportAuditEventType =
  | "mapping_previewed"
  | "dedupe_reviewed"
  | "consent_mapped"
  | "validation_checklist_opened"
  | "human_review_noted";

export type ImportAuditEvent = {
  type: ImportAuditEventType;
  at: string;
  actor: string;
  summary: string;
};

export type SampleImportedCandidate = {
  candidate_id: string;
  display_name: string;
  role_id: string;
  role_title: string;
  import_source_label: string;
  mapping_status: string;
  consent_status: string;
  human_review_required: true;
};

export type AtsImportReadinessRecord = {
  connector_id: string;
  connector_label: string;
  import_readiness_status: "pilot_not_live";
  pilot_labelled: true;
  no_live_sync: true;
  no_writeback: true;
  connectors: AtsConnectorRow[];
  field_mappings: FieldMappingRow[];
  dedupe_rules: DedupeRuleRow[];
  consent_mappings: ConsentMappingRow[];
  validation_checklist: ImportChecklistItem[];
  risk_flags: ImportRiskFlag[];
  sample_candidate: SampleImportedCandidate;
  audit_events: ImportAuditEvent[];
};

const CONNECTORS: AtsConnectorRow[] = [
  {
    id: "lever",
    name: "Lever",
    status: "mapping_ready_not_live",
    note: "Field mapping preview ready — no live ATS sync.",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    status: "mapping_ready_not_live",
    note: "Mapping matrix drafted — human review required before any import.",
  },
  {
    id: "teamtailor",
    name: "Teamtailor",
    status: "planned",
    note: "Connector planned — import readiness review only.",
  },
  {
    id: "recruitee",
    name: "Recruitee",
    status: "planned",
    note: "Planned connector — no credentials or sync in this slice.",
  },
  {
    id: "workable",
    name: "Workable",
    status: "planned",
    note: "Planned mapping pass — demo-only until review.",
  },
  {
    id: "csv_manual",
    name: "CSV / Manual",
    status: "pilot_ready",
    note: "Pilot-ready via talent pool CSV — mapping review, not live ATS sync.",
  },
];

const FIELD_MAPPINGS: FieldMappingRow[] = [
  { ats_field: "candidate.id", twin_field: "external_ats_id", transform: "string passthrough", review_required: true },
  { ats_field: "candidate.name", twin_field: "display_name", transform: "split first/last (sample)", review_required: true },
  { ats_field: "candidate.email", twin_field: "contact_email_hash", transform: "hash only — no raw PII in demo", review_required: true },
  { ats_field: "application.stage", twin_field: "pipeline_stage", transform: "stage map table", review_required: true },
  { ats_field: "application.role_id", twin_field: "role_id", transform: "role linkage preview", review_required: true },
  { ats_field: "resume.url", twin_field: "cv_fingerprint", transform: "fingerprint placeholder — no download", review_required: true },
  { ats_field: "tags", twin_field: "skills", transform: "normalize tags → skills array", review_required: false },
  { ats_field: "consent.marketing", twin_field: "consent_status", transform: "consent map — privacy review required", review_required: true },
];

const DEDUPE_RULES: DedupeRuleRow[] = [
  {
    id: "email_hash",
    strategy: "email_hash",
    signal: "sha256(sample-contact@example.invalid)",
    demo_match: "demo-candidate-001 candidate pool row",
    review_required: true,
  },
  {
    id: "name_role",
    strategy: "name_plus_role",
    signal: "Sample Name · Senior Platform Engineer",
    demo_match: "potential duplicate in demo-role-001 pipeline",
    review_required: true,
  },
  {
    id: "cv_fingerprint",
    strategy: "cv_fingerprint",
    signal: "fp:demo-cv-hash-7a3c",
    demo_match: "matches prior import fingerprint (demo-only)",
    review_required: true,
  },
  {
    id: "talent_pool",
    strategy: "talent_pool_overlap",
    signal: "imported_internal_pool",
    demo_match: "overlap with talent pool import row",
    review_required: true,
  },
  {
    id: "consent_mismatch",
    strategy: "consent_mismatch",
    signal: "ATS marketing=yes · TWIN contact=review",
    demo_match: "consent mismatch flag — human review required",
    review_required: true,
  },
];

const CONSENT_MAPPINGS: ConsentMappingRow[] = [
  {
    ats_signal: "gdpr_consent.marketing",
    twin_field: "contact_permission",
    privacy_review_required: true,
    note: "Map to contact permission — privacy review required; no automatic outreach.",
  },
  {
    ats_signal: "gdpr_consent.data_processing",
    twin_field: "processing_context",
    privacy_review_required: true,
    note: "Processing context label only — not legal advice.",
  },
  {
    ats_signal: "gdpr_consent.retention",
    twin_field: "retention_note",
    privacy_review_required: true,
    note: "Retention window preview — human review required before import.",
  },
  {
    ats_signal: "source_attribution",
    twin_field: "data_source",
    privacy_review_required: true,
    note: "ATS import source tag → trust data source (demo-only).",
  },
];

const VALIDATION_CHECKLIST: ImportChecklistItem[] = [
  { id: "connector_selected", label_key: "checkConnectorSelected", status: "mapped" },
  { id: "field_mapping_reviewed", label_key: "checkFieldMappingReviewed", status: "pending_review" },
  { id: "dedupe_rules_reviewed", label_key: "checkDedupeReviewed", status: "pending_review" },
  { id: "consent_mapping_reviewed", label_key: "checkConsentMappingReviewed", status: "pending_review" },
  { id: "pii_minimized", label_key: "checkPiiMinimized", status: "mapped" },
  { id: "no_writeback_confirmed", label_key: "checkNoWritebackConfirmed", status: "mapped" },
  { id: "human_review_owner", label_key: "checkHumanReviewOwner", status: "pending_review" },
  { id: "pilot_scope_acknowledged", label_key: "checkPilotScopeAcknowledged", status: "mapped" },
];

const RISK_FLAGS: ImportRiskFlag[] = [
  {
    id: "no_live_sync",
    severity: "info",
    summary: "Import readiness only — no live ATS sync enabled in this pilot.",
  },
  {
    id: "consent_gap",
    severity: "warning",
    summary: "Consent mapping gap detected in sample — privacy review required.",
  },
  {
    id: "dedupe_collision",
    severity: "review",
    summary: "Dedupe preview shows potential collision — human review required before merge.",
  },
  {
    id: "stage_unknown",
    severity: "warning",
    summary: "One ATS stage has no TWIN pipeline mapping — blocked until mapped.",
  },
];

const SAMPLE_CANDIDATE: SampleImportedCandidate = {
  candidate_id: ATS_IMPORT_SAMPLE_CANDIDATE_ID,
  display_name: "Sample Candidate (demo)",
  role_id: ATS_IMPORT_SAMPLE_ROLE_ID,
  role_title: "Senior Platform Engineer",
  import_source_label: "Lever mapping preview (demo-only)",
  mapping_status: "mapped_preview",
  consent_status: "review_required",
  human_review_required: true,
};

const AUDIT_EVENTS: ImportAuditEvent[] = [
  {
    type: "mapping_previewed",
    at: "2026-06-17T09:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Field mapping preview opened — no live sync, no writeback.",
  },
  {
    type: "dedupe_reviewed",
    at: "2026-06-17T09:15:00Z",
    actor: "Recruiter (sample)",
    summary: "Dedupe rules reviewed in demo — human review required for merge.",
  },
  {
    type: "consent_mapped",
    at: "2026-06-17T09:30:00Z",
    actor: "Consent reviewer (sample)",
    summary: "Consent mapping preview — privacy review required.",
  },
  {
    type: "validation_checklist_opened",
    at: "2026-06-17T10:00:00Z",
    actor: "Recruiter (sample)",
    summary: "Import validation checklist opened — 8 items, pilot not live.",
  },
  {
    type: "human_review_noted",
    at: "2026-06-17T10:30:00Z",
    actor: "Decision owner (sample)",
    summary: "Human review boundary acknowledged — import readiness only.",
  },
];

export function getAtsImportReadinessDemo(): AtsImportReadinessRecord {
  return {
    connector_id: ATS_IMPORT_READINESS_DEMO_CONNECTOR,
    connector_label: "Lever mapping pilot",
    import_readiness_status: "pilot_not_live",
    pilot_labelled: true,
    no_live_sync: true,
    no_writeback: true,
    connectors: CONNECTORS,
    field_mappings: FIELD_MAPPINGS,
    dedupe_rules: DEDUPE_RULES,
    consent_mappings: CONSENT_MAPPINGS,
    validation_checklist: VALIDATION_CHECKLIST,
    risk_flags: RISK_FLAGS,
    sample_candidate: SAMPLE_CANDIDATE,
    audit_events: AUDIT_EVENTS,
  };
}
