import { EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE } from "@/lib/executive-product-proof";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import { getInvestorTrustProofDemo, type InvestorTrustProofRecord } from "@/lib/investor-trust-proof-demo-data";

export { LAUNCH_STANCE };
export const INVESTOR_TRUST_PROOF_ROUTE = "/investor/trust-proof";
export const INVESTOR_TRUST_PROOF_PAGE_MARKER = "investor-trust-proof-page";
export const INVESTOR_TRUST_PROOF_MARKERS = {
  page: INVESTOR_TRUST_PROOF_PAGE_MARKER,
  header: "investor-trust-proof-header",
  architecture: "investor-trust-proof-architecture",
  matrix: "investor-trust-proof-matrix",
  recruiter: "investor-trust-proof-recruiter",
  boundary: "investor-trust-proof-boundary",
  launch: "investor-trust-proof-launch",
  risks: "investor-trust-proof-risks",
  conversion: "investor-trust-proof-conversion",
  pilotBadge: "investor-trust-proof-pilot-badge",
} as const;
export const INVESTOR_TRUST_PROOF_LINKS = [
  { href: EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE, labelKey: "investorTrustProof.linkProductProof" as TranslationKey },
  { href: "/demo", labelKey: "investorTrustProof.linkDemo" as TranslationKey },
] as const;
export function investorTrustProofHref(): string { return INVESTOR_TRUST_PROOF_ROUTE; }
export function resolveInvestorTrustProof(): InvestorTrustProofRecord { return getInvestorTrustProofDemo(); }
