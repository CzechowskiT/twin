import type { TranslationKey } from "@/lib/i18n";

/** Homepage quick-entry cards — existing public routes only (Slice 17). */
export type PublicExploreTwinEntryId =
  | "candidate"
  | "recruiter"
  | "company"
  | "investor"
  | "demo"
  | "trust"
  | "status"
  | "productProof"
  | "faq"
  | "howItWorks";

export type PublicExploreTwinEntry = {
  id: PublicExploreTwinEntryId;
  href: string;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
};

export const PUBLIC_EXPLORE_TWIN_ENTRIES: readonly PublicExploreTwinEntry[] = [
  {
    id: "candidate",
    href: "/dashboard",
    titleKey: "home.exploreTwinCandidateTitle",
    hintKey: "home.exploreTwinCandidateHint",
  },
  {
    id: "recruiter",
    href: "/recruiter",
    titleKey: "home.exploreTwinRecruiterTitle",
    hintKey: "home.exploreTwinRecruiterHint",
  },
  {
    id: "company",
    href: "/company/dashboard",
    titleKey: "home.exploreTwinCompanyTitle",
    hintKey: "home.exploreTwinCompanyHint",
  },
  {
    id: "investor",
    href: "/investor",
    titleKey: "home.exploreTwinInvestorTitle",
    hintKey: "home.exploreTwinInvestorHint",
  },
  {
    id: "demo",
    href: "/demo",
    titleKey: "home.exploreTwinDemoTitle",
    hintKey: "home.exploreTwinDemoHint",
  },
  {
    id: "trust",
    href: "/dashboard/trust",
    titleKey: "home.exploreTwinTrustTitle",
    hintKey: "home.exploreTwinTrustHint",
  },
  {
    id: "status",
    href: "/status",
    titleKey: "home.exploreTwinStatusTitle",
    hintKey: "home.exploreTwinStatusHint",
  },
  {
    id: "productProof",
    href: "/investor/product-proof",
    titleKey: "home.exploreTwinProductProofTitle",
    hintKey: "home.exploreTwinProductProofHint",
  },
  {
    id: "faq",
    href: "/faq",
    titleKey: "home.exploreTwinFaqTitle",
    hintKey: "home.exploreTwinFaqHint",
  },
  {
    id: "howItWorks",
    href: "/how-it-works",
    titleKey: "home.exploreTwinHowItWorksTitle",
    hintKey: "home.exploreTwinHowItWorksHint",
  },
] as const;

export const PUBLIC_EXPLORE_TWIN_HREFS = PUBLIC_EXPLORE_TWIN_ENTRIES.map((e) => e.href);
