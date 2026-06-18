import { candidateTrustHref } from "@/lib/candidate-trust";

export const RECRUITER_TRUST_REVIEW_QUEUE_DEMO_CANDIDATE_ID = "demo-candidate-001";

export type TrustReviewQueueItem = {
  id: string;
  kind: "correction" | "portability" | "revoke_delete" | "identity" | "consent_receipt" | "audit_export";
  label_key: string;
  status: "preview" | "review_required" | "planned";
  priority: "high" | "medium" | "low";
  summary: string;
  candidate_href: string;
};

export type RecruiterTrustReviewQueueRecord = {
  id: string;
  pilot_labelled: boolean;
  candidate_id: string;
  candidate_display: string;
  headline: string;
  summary_total: number;
  summary_review_required: number;
  summary_preview_only: number;
  queue_items: TrustReviewQueueItem[];
  evidence_refs: { id: string; label_key: string; href: string }[];
};

export function getRecruiterTrustReviewQueueDemo(): RecruiterTrustReviewQueueRecord {
  const candidate_id = RECRUITER_TRUST_REVIEW_QUEUE_DEMO_CANDIDATE_ID;
  const queue_items: TrustReviewQueueItem[] = [
    {
      id: "trq-revoke",
      kind: "revoke_delete",
      label_key: "recruiterTrustReviewQueue.itemRevokeDelete",
      status: "review_required",
      priority: "high",
      summary: "Revoke/delete preview opened — human review required, no live delete.",
      candidate_href: "/dashboard/trust/revoke-delete",
    },
    {
      id: "trq-correction",
      kind: "correction",
      label_key: "recruiterTrustReviewQueue.itemCorrection",
      status: "preview",
      priority: "medium",
      summary: "Correction request draft saved locally — preview only, not submitted.",
      candidate_href: "/dashboard/trust/corrections",
    },
    {
      id: "trq-portability",
      kind: "portability",
      label_key: "recruiterTrustReviewQueue.itemPortability",
      status: "preview",
      priority: "medium",
      summary: "Portability request preview — no backend submission on pilot.",
      candidate_href: "/dashboard/trust/portability",
    },
    {
      id: "trq-identity",
      kind: "identity",
      label_key: "recruiterTrustReviewQueue.itemIdentity",
      status: "planned",
      priority: "low",
      summary: "Identity verification provider not configured — pilot visibility only.",
      candidate_href: "/dashboard/trust/identity-verification",
    },
    {
      id: "trq-consent",
      kind: "consent_receipt",
      label_key: "recruiterTrustReviewQueue.itemConsentReceipt",
      status: "preview",
      priority: "low",
      summary: "Consent receipt bundle indexed — client-side JSON download only.",
      candidate_href: "/dashboard/trust/consent-receipt",
    },
    {
      id: "trq-audit",
      kind: "audit_export",
      label_key: "recruiterTrustReviewQueue.itemAuditExport",
      status: "preview",
      priority: "low",
      summary: "Trust audit export prepared locally — six workflows, no backend write.",
      candidate_href: "/dashboard/trust/audit-export",
    },
  ];
  return {
    id: "recruiter-trust-review-queue-demo",
    pilot_labelled: true,
    candidate_id,
    candidate_display: "Demo Candidate 001",
    headline: "Read-only trust review queue for demo-candidate-001 — no approvals or outreach.",
    summary_total: queue_items.length,
    summary_review_required: queue_items.filter((i) => i.status === "review_required").length,
    summary_preview_only: queue_items.filter((i) => i.status === "preview").length,
    queue_items,
    evidence_refs: [
      {
        id: "ev-trust",
        label_key: "recruiterTrustReviewQueue.itemConsentReceipt",
        href: candidateTrustHref(candidate_id, "recruiter"),
      },
    ],
  };
}
