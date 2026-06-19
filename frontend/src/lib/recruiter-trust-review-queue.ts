/** Recruiter trust review queue — read-only demo aggregation of candidate trust events. */

import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateIdentityVerificationHref } from "@/lib/candidate-identity-verification";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getRecruiterTrustReviewQueueDemo,
  RECRUITER_TRUST_REVIEW_QUEUE_DEMO_CANDIDATE_ID,
  type RecruiterTrustReviewQueueRecord,
} from "@/lib/recruiter-trust-review-queue-demo-data";
import { requestIntakeRecruiterHref } from "@/lib/request-intake";
import { fetchSafePersistenceList } from "@/lib/safe-persistence-api";

export type SafePersistenceSource = "live" | "demo";

export { RECRUITER_TRUST_REVIEW_QUEUE_DEMO_CANDIDATE_ID };
export { LAUNCH_STANCE };

export const RECRUITER_TRUST_REVIEW_QUEUE_ROUTE = "/recruiter/trust-review-queue";
export const REVIEW_QUEUE_API_PATH = "/api/v1/review-queue";

export const RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER = "recruiter-trust-review-queue-page";

export const RECRUITER_TRUST_REVIEW_QUEUE_MARKERS = {
  page: RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
  header: "recruiter-trust-review-queue-header",
  summary: "recruiter-trust-review-queue-summary",
  table: "recruiter-trust-review-queue-table",
  priority: "recruiter-trust-review-queue-priority",
  evidence: "recruiter-trust-review-queue-evidence",
  suggested: "recruiter-trust-review-queue-suggested",
  boundary: "recruiter-trust-review-queue-boundary",
  linkedModules: "recruiter-trust-review-queue-linked-modules",
  pilotBadge: "recruiter-trust-review-queue-pilot-badge",
  hubPromo: "recruiter-trust-review-queue-hub-promo",
  navLink: "recruiter-trust-review-queue-nav-link",
  requestIntakeLink: "recruiter-trust-review-queue-request-intake-link",
} as const;

export const RECRUITER_TRUST_REVIEW_QUEUE_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
];

export const RECRUITER_TRUST_REVIEW_QUEUE_MODULE_LINKS = [
  { id: "daily_cockpit", href: "/recruiter/daily-cockpit", labelKey: "recruiterTrustReviewQueue.linkDailyCockpit" as TranslationKey },
  { id: "sor_hub", href: "/recruiter", labelKey: "recruiterTrustReviewQueue.linkSorHub" as TranslationKey },
  {
    id: "candidate_trust",
    href: candidateTrustHref(RECRUITER_TRUST_REVIEW_QUEUE_DEMO_CANDIDATE_ID, "recruiter"),
    labelKey: "recruiterTrustReviewQueue.itemConsentReceipt" as TranslationKey,
  },
  { id: "correction", href: candidateCorrectionRequestHref(), labelKey: "recruiterTrustReviewQueue.itemCorrection" as TranslationKey },
  { id: "portability", href: candidateDataPortabilityHref(), labelKey: "recruiterTrustReviewQueue.itemPortability" as TranslationKey },
  { id: "revoke", href: candidateRevokeDeleteHref(), labelKey: "recruiterTrustReviewQueue.itemRevokeDelete" as TranslationKey },
  { id: "identity", href: candidateIdentityVerificationHref(), labelKey: "recruiterTrustReviewQueue.itemIdentity" as TranslationKey },
  { id: "audit", href: candidateTrustAuditExportHref(), labelKey: "recruiterTrustReviewQueue.itemAuditExport" as TranslationKey },
  { id: "consent", href: candidateConsentReceiptHref(), labelKey: "recruiterTrustReviewQueue.itemConsentReceipt" as TranslationKey },
] as const;

export function recruiterTrustReviewQueueHref(): string {
  return RECRUITER_TRUST_REVIEW_QUEUE_ROUTE;
}

export function resolveRecruiterTrustReviewQueue(): RecruiterTrustReviewQueueRecord {
  return getRecruiterTrustReviewQueueDemo();
}

type ApiReviewItem = { id: number; item_kind: string; subject_ref: string; status: string };
type ApiReviewResponse = { items: ApiReviewItem[] };

export async function loadRecruiterTrustReviewQueue(): Promise<{
  source: SafePersistenceSource;
  record: RecruiterTrustReviewQueueRecord;
  liveCount: number;
}> {
  const demo = getRecruiterTrustReviewQueueDemo();
  const result = await fetchSafePersistenceList<ApiReviewResponse>(REVIEW_QUEUE_API_PATH, { items: [] });
  if (result.source === "live") {
    return { source: "live", record: demo, liveCount: result.data.items.length };
  }
  return { source: "demo", record: demo, liveCount: 0 };
}
