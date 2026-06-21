/** Board placement evidence monitor — deterministic demo data. */

import { getPlacementVerificationDemo, type EvidenceItem, type RiskFlag } from "@/lib/placement-verification-demo-data";

export type EvidenceMatrixRow = {
  id: string;
  persona: "candidate" | "recruiter" | "company" | "board";
  route: string;
  evidence_kind: string;
  status: "present" | "missing" | "pending" | "demo_only";
};

export type BlockedCapabilityRow = {
  id: string;
  label: string;
  reason: string;
};

export type BoardPlacementEvidenceMonitorRecord = {
  placement_id: string;
  evidence_matrix: readonly EvidenceMatrixRow[];
  evidence_items: readonly EvidenceItem[];
  risk_flags: readonly RiskFlag[];
  economics_note: string;
  blocked_capabilities: readonly BlockedCapabilityRow[];
  persona_routes: readonly { id: string; route: string; persona: string }[];
};

const EVIDENCE_MATRIX: EvidenceMatrixRow[] = [
  { id: "cand_preview", persona: "candidate", route: "/dashboard/placement-verification", evidence_kind: "self_declaration", status: "present" },
  { id: "cand_external", persona: "candidate", route: "/dashboard/placement-verification", evidence_kind: "external_confirmation", status: "missing" },
  { id: "rec_checklist", persona: "recruiter", route: "/recruiter/placement-verification", evidence_kind: "human_review_checklist", status: "demo_only" },
  { id: "co_checklist", persona: "company", route: "/company/placement-verification", evidence_kind: "attestation_preview", status: "pending" },
  { id: "board_monitor", persona: "board", route: "/board/placement-verification", evidence_kind: "evidence_matrix", status: "present" },
];

const BLOCKED: BlockedCapabilityRow[] = [
  { id: "billing", label: "Automated billing trigger", reason: "No payment initiated — economics preview no-op only." },
  { id: "invoice", label: "Invoice generation", reason: "No invoice generated — fee eligibility not evaluated." },
  { id: "employer_outreach", label: "Employer outreach", reason: "No automated employer contact — human review path only." },
  { id: "ats_sync", label: "ATS webhook ingestion", reason: "Not configured in pilot — ATS webhook ingestion disabled." },
  { id: "legal_verify", label: "Legal verification claim", reason: "Internal placement evidence only — not legal verification." },
  { id: "phase3b", label: "Phase 3B multitab stress", reason: "Hard blocked — not in scope for this slice." },
];

export function getBoardPlacementEvidenceMonitorDemo(): BoardPlacementEvidenceMonitorRecord {
  const placement = getPlacementVerificationDemo();
  return {
    placement_id: "demo-placement-001",
    evidence_matrix: EVIDENCE_MATRIX,
    evidence_items: placement.evidence_items,
    risk_flags: placement.risk_flags,
    economics_note: "Economics preview no-op — no payment initiated, fee eligibility not evaluated, retention clock not started.",
    blocked_capabilities: BLOCKED,
    persona_routes: [
      { id: "candidate", route: "/dashboard/placement-verification", persona: "candidate" },
      { id: "recruiter", route: "/recruiter/placement-verification", persona: "recruiter" },
      { id: "company", route: "/company/placement-verification", persona: "company" },
      { id: "board", route: "/board/placement-verification", persona: "board" },
    ],
  };
}
