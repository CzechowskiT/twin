/**
 * Slice 21 — canonical founder-led demo cross-link map for public marketing surfaces.
 */
import type { TranslationKey } from "@/lib/i18n";

export type FounderDemoCrosslinkPage =
  | "demo"
  | "how-it-works"
  | "faq"
  | "for-investors"
  | "investor"
  | "investor-product-proof";

export type FounderDemoCrosslink = {
  href: string;
  labelKey: TranslationKey;
};

export const FOUNDER_DEMO_CROSSLINKS_BY_PAGE: Record<
  FounderDemoCrosslinkPage,
  readonly FounderDemoCrosslink[]
> = {
  demo: [
    { href: "/investor", labelKey: "investorFundraising.ctaInvestorRoom" },
    { href: "/investor/product-proof", labelKey: "investorFundraising.ctaProductProof" },
    { href: "/how-it-works", labelKey: "nav.howItWorks" },
    { href: "/faq", labelKey: "nav.faq" },
    { href: "/#explore-twin", labelKey: "nav.exploreTwin" },
  ],
  "how-it-works": [
    { href: "/demo", labelKey: "nav.demo" },
    { href: "/faq", labelKey: "nav.faq" },
    { href: "/#explore-twin", labelKey: "nav.exploreTwin" },
  ],
  faq: [
    { href: "/demo", labelKey: "nav.demo" },
    { href: "/how-it-works", labelKey: "nav.howItWorks" },
    { href: "/#explore-twin", labelKey: "nav.exploreTwin" },
  ],
  "for-investors": [
    { href: "/investor", labelKey: "investorFundraising.ctaInvestorRoom" },
    { href: "/investor/product-proof", labelKey: "investorFundraising.ctaProductProof" },
    { href: "/demo", labelKey: "nav.demo" },
  ],
  investor: [
    { href: "/investor/product-proof", labelKey: "investorFundraising.ctaProductProof" },
    { href: "/for-investors", labelKey: "site.footerForInvestors" },
    { href: "/demo", labelKey: "nav.demo" },
  ],
  "investor-product-proof": [
    { href: "/investor", labelKey: "investorFundraising.ctaInvestorRoom" },
    { href: "/for-investors", labelKey: "site.footerForInvestors" },
    { href: "/demo", labelKey: "nav.demo" },
  ],
};

export function founderDemoCrosslinkHrefs(page: FounderDemoCrosslinkPage): string[] {
  return FOUNDER_DEMO_CROSSLINKS_BY_PAGE[page].map((link) => link.href);
}
