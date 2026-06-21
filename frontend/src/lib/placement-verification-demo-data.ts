/** Placement verification — deterministic demo records (no live API yet). */

export const PLACEMENT_VERIFICATION_DEMO_ID = "demo-placement-001";
export const PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const PLACEMENT_STATUS_ALLOWLIST = [
  "pipeline",
  "offer_reported",
  "verification_pending",
  "placement_verified",
  "verification_failed",
  "disputed",
] as const;

export type PlacementStatus = (typeof PLACEMENT_STATUS_ALLOWLIST)[number];

export const VERIFICATION_STAGE_ALLOWLIST = [
  "not_started",
  "self_declaration",
  "evidence_collection",
  "external_confirmation_pending",
  "human_review",
  "verification_ready",
  "closed",
] as const;

export type VerificationStage = (typeof VERIFICATION_STAGE_ALLOWLIST)[number];

export type EvidenceItem = {
  id: string;
  kind: "self_declaration" | "work_email_hint" | "document_upload" | "calendar_hint" | "attestation_link";
  label: string;
  status: "present" | "missing" | "pending" | "not_applicable";
  confidence: "low" | "medium" | "high" | "none";
  collected_at?: string;
};

export type RiskFlag = {
  id: string;
  severity: "info" | "warning" | "critical";
  label: string;
  detail: string;
};

export type EconomicsPreview = {
  /** No-op preview — no billing, invoice, or revenue signals. */
  fee_eligibility: "not_evaluated";
  payment_initiated: false;
  invoice_status: "none";
  retention_clock: "not_started";
  note: string;
};

export type PlacementAuditReference = {
  event_type: string;
  target_id: string;
  created_at: string;
};

export type PlacementVerificationSource = "demo" | "live" | "partial";

export type PlacementVerificationRecord = {
  placement_id: string;
  candidate_id: string;
  role_context_id: string;
  company_slug: string;
  application_id: string;
  match_id: string;
  placement_status: PlacementStatus;
  verification_stage: VerificationStage;
  evidence_items: readonly EvidenceItem[];
  risk_flags: readonly RiskFlag[];
  economics_preview: EconomicsPreview;
  audit_references: readonly PlacementAuditReference[];
  source: PlacementVerificationSource;
  role_title: string;
  company_label: string;
  headline: string;
};

const DEMO_EVIDENCE: EvidenceItem[] = [
  {
    id: "self_decl",
    kind: "self_declaration",
    label: "Candidate self-declaration",
    status: "present",
    confidence: "medium",
    collected_at: "2026-06-18T10:00:00Z",
  },
  {
    id: "work_email",
    kind: "work_email_hint",
    label: "Work email confirmation",
    status: "missing",
    confidence: "none",
  },
  {
    id: "doc_upload",
    kind: "document_upload",
    label: "Offer document (optional)",
    status: "not_applicable",
    confidence: "none",
  },
  {
    id: "calendar_hint",
    kind: "calendar_hint",
    label: "Calendar supporting hint",
    status: "pending",
    confidence: "low",
  },
  {
    id: "attestation",
    kind: "attestation_link",
    label: "External attestation",
    status: "missing",
    confidence: "none",
  },
];

const DEMO_RISK_FLAGS: RiskFlag[] = [
  {
    id: "no_external",
    severity: "warning",
    label: "No external confirmation",
    detail: "Self-declaration only — external confirmation not yet collected.",
  },
  {
    id: "domain_mismatch",
    severity: "info",
    label: "Domain hint only",
    detail: "Work email domain match is a hint, not legal verification.",
  },
];

const DEMO_AUDIT: PlacementAuditReference[] = [
  { event_type: "placement.declared", target_id: PLACEMENT_VERIFICATION_DEMO_ID, created_at: "2026-06-18T10:00:00Z" },
  { event_type: "placement.verification_pending", target_id: PLACEMENT_VERIFICATION_DEMO_ID, created_at: "2026-06-18T10:01:00Z" },
];

export function getPlacementVerificationDemo(): PlacementVerificationRecord {
  return {
    placement_id: PLACEMENT_VERIFICATION_DEMO_ID,
    candidate_id: PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
    role_context_id: "role-ctx-demo-senior-fe",
    company_slug: "demo-acme",
    application_id: "app-demo-001",
    match_id: "match-demo-001",
    placement_status: "verification_pending",
    verification_stage: "external_confirmation_pending",
    evidence_items: DEMO_EVIDENCE,
    risk_flags: DEMO_RISK_FLAGS,
    economics_preview: {
      fee_eligibility: "not_evaluated",
      payment_initiated: false,
      invoice_status: "none",
      retention_clock: "not_started",
      note: "Economics preview only — no payment initiated, no invoice, no revenue recognition.",
    },
    audit_references: DEMO_AUDIT,
    source: "demo",
    role_title: "Senior Frontend Engineer",
    company_label: "Demo Acme (internal)",
    headline: "Internal placement evidence — verification-ready preview, not legal verification.",
  };
}

export function isAllowedPlacementStatus(value: string): value is PlacementStatus {
  return (PLACEMENT_STATUS_ALLOWLIST as readonly string[]).includes(value);
}

export function isAllowedVerificationStage(value: string): value is VerificationStage {
  return (VERIFICATION_STAGE_ALLOWLIST as readonly string[]).includes(value);
}
