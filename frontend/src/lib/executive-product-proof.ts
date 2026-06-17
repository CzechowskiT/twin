/** Executive product proof / board demo pack — honest investor-facing SOR map. */

import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustCenterHref } from "@/lib/candidate-trust-center";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { decisionMemoryHref } from "@/lib/decision-memory";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { companyHiringCockpitHref } from "@/lib/company-hiring-cockpit";
import { candidateCommunicationHref } from "@/lib/safe-communication";
import { candidateTeamHref } from "@/lib/team-collaboration";
import {
  EXECUTIVE_PRODUCT_PROOF_DELIVERY_HISTORY,
  EXECUTIVE_PRODUCT_PROOF_MATURITY_MATRIX,
  EXECUTIVE_PRODUCT_PROOF_MILESTONES,
  EXECUTIVE_PRODUCT_PROOF_RISKS,
  EXECUTIVE_PRODUCT_PROOF_SOR_STACK,
  type ExecutiveProofDeliveryEntry,
  type ExecutiveProofMaturityRow,
  type ExecutiveProofMilestone,
  type ExecutiveProofRisk,
  type ExecutiveProofSorLayer,
} from "@/lib/executive-product-proof-demo-data";

export { LAUNCH_STANCE };

export const EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE = "/investor/product-proof";
export const EXECUTIVE_PRODUCT_PROOF_WORKSPACE_ROUTE = "/workspace/investor/product-proof";

export const EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER = "executive-product-proof-page";

export const EXECUTIVE_PRODUCT_PROOF_MARKERS = {
  page: EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER,
  header: "executive-product-proof-header",
  sorStack: "executive-product-proof-sor-stack",
  maturityMatrix: "executive-product-proof-maturity-matrix",
  deliveryHistory: "executive-product-proof-delivery-history",
  launchStatus: "executive-product-proof-launch-status",
  demoLinks: "executive-product-proof-demo-links",
  humanDecisioning: "executive-product-proof-human-decisioning",
  boundaryProof: "executive-product-proof-boundary-proof",
  riskRegister: "executive-product-proof-risk-register",
  milestones: "executive-product-proof-milestones",
} as const;

export const EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS = [
  { id: "demo", href: "/demo", labelKey: "executiveProductProof.linkDemo" as TranslationKey },
  {
    id: "profile360",
    href: candidateProfile360Href("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkProfile360" as TranslationKey,
  },
  {
    id: "pipeline",
    href: jobPipelineHref("demo-role-001", "recruiter"),
    labelKey: "executiveProductProof.linkPipeline" as TranslationKey,
  },
  {
    id: "notes",
    href: candidateCollaborationHref("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkNotes" as TranslationKey,
  },
  {
    id: "trust",
    href: candidateTrustHref("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkTrust" as TranslationKey,
  },
  {
    id: "candidate_trust_center",
    href: candidateTrustCenterHref(),
    labelKey: "executiveProductProof.linkCandidateTrustCenter" as TranslationKey,
  },
  {
    id: "team",
    href: candidateTeamHref("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkTeam" as TranslationKey,
  },
  {
    id: "communication",
    href: candidateCommunicationHref("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkCommunication" as TranslationKey,
  },
  {
    id: "ats",
    href: atsImportReadinessHref("recruiter"),
    labelKey: "executiveProductProof.linkAtsReadiness" as TranslationKey,
  },
  {
    id: "decision_memory",
    href: decisionMemoryHref("demo-candidate-001", "recruiter"),
    labelKey: "executiveProductProof.linkDecisionMemory" as TranslationKey,
  },
  {
    id: "daily_cockpit",
    href: recruiterDailyCockpitHref(),
    labelKey: "executiveProductProof.linkDailyCockpit" as TranslationKey,
  },
  {
    id: "hiring_cockpit",
    href: companyHiringCockpitHref(),
    labelKey: "executiveProductProof.linkHiringCockpit" as TranslationKey,
  },
] as const;

export function getExecutiveProductProofSorStack(): readonly ExecutiveProofSorLayer[] {
  return EXECUTIVE_PRODUCT_PROOF_SOR_STACK;
}

export function getExecutiveProductProofMaturityMatrix(): readonly ExecutiveProofMaturityRow[] {
  return EXECUTIVE_PRODUCT_PROOF_MATURITY_MATRIX;
}

export function getExecutiveProductProofDeliveryHistory(): readonly ExecutiveProofDeliveryEntry[] {
  return EXECUTIVE_PRODUCT_PROOF_DELIVERY_HISTORY;
}

export function getExecutiveProductProofRisks(): readonly ExecutiveProofRisk[] {
  return EXECUTIVE_PRODUCT_PROOF_RISKS;
}

export function getExecutiveProductProofMilestones(): readonly ExecutiveProofMilestone[] {
  return EXECUTIVE_PRODUCT_PROOF_MILESTONES;
}

export const EXECUTIVE_PRODUCT_PROOF_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /automatic application/i,
  /AI decided/i,
  /GDPR compliant/i,
  /ATS sync completed/i,
  /writeback completed/i,
];
