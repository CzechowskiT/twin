import type { TranslationKey } from "@/lib/i18n";

/** Desktop/mobile Explore TWIN mega-panel — existing public routes only. */
export type ExploreMegaPanelLink = {
  href: string;
  labelKey: TranslationKey;
  /** Visual emphasis for executive investor room (not in guest header main strip). */
  highlight?: boolean;
};

export type ExploreMegaPanelGroupId = "product" | "investors" | "demo" | "trust";

export type ExploreMegaPanelGroup = {
  id: ExploreMegaPanelGroupId;
  titleKey: TranslationKey;
  links: readonly ExploreMegaPanelLink[];
};

export const HEADER_EXPLORE_MEGA_PANEL_GROUPS: readonly ExploreMegaPanelGroup[] = [
  {
    id: "product",
    titleKey: "nav.exploreGroupProduct",
    links: [
      { href: "/dashboard", labelKey: "home.exploreTwinCandidateTitle" },
      { href: "/recruiter", labelKey: "home.exploreTwinRecruiterTitle" },
      { href: "/company/dashboard", labelKey: "home.exploreTwinCompanyTitle" },
    ],
  },
  {
    id: "investors",
    titleKey: "nav.exploreGroupInvestors",
    links: [
      { href: "/for-investors", labelKey: "site.footerForInvestors" },
      { href: "/investor", labelKey: "site.footerInvestorRoom", highlight: true },
      { href: "/investor/product-proof", labelKey: "nav.exploreProductProof" },
    ],
  },
  {
    id: "demo",
    titleKey: "nav.exploreGroupDemo",
    links: [
      { href: "/demo", labelKey: "nav.demo" },
      { href: "/how-it-works", labelKey: "nav.howItWorks" },
      { href: "/faq", labelKey: "nav.faq" },
    ],
  },
  {
    id: "trust",
    titleKey: "nav.exploreGroupTrust",
    links: [
      { href: "/dashboard/trust", labelKey: "site.footerTrustCenter" },
      { href: "/status", labelKey: "site.footerStatus" },
    ],
  },
] as const;

export const HEADER_EXPLORE_MEGA_PANEL_HREFS = HEADER_EXPLORE_MEGA_PANEL_GROUPS.flatMap((g) =>
  g.links.map((l) => l.href),
);
