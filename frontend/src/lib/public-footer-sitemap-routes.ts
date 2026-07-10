import type { TranslationKey } from "@/lib/i18n";
import { TRUST_CENTER_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";

/** Stable public footer sitemap — persona-independent secondary nav (Slice 18). */
export type PublicFooterSitemapEntry = {
  href: string;
  labelKey: TranslationKey;
};

export const PUBLIC_FOOTER_SITEMAP_ENTRIES: readonly PublicFooterSitemapEntry[] = [
  { href: "/for-candidates", labelKey: "nav.forCandidates" },
  { href: "/for-recruiters", labelKey: "nav.forRecruiters" },
  { href: "/for-companies", labelKey: "nav.forCompanies" },
  { href: "/for-investors", labelKey: "site.footerForInvestors" },
  { href: "/investor", labelKey: "site.footerInvestorRoom" },
  { href: "/demo", labelKey: "nav.demo" },
  { href: "/faq", labelKey: "nav.faq" },
  { href: "/status", labelKey: "site.footerStatus" },
  { href: TRUST_CENTER_ROADMAP_OUTSIDE_HREF, labelKey: "site.footerTrustCenter" },
] as const;

export const PUBLIC_FOOTER_SITEMAP_HREFS = PUBLIC_FOOTER_SITEMAP_ENTRIES.map((e) => e.href);
