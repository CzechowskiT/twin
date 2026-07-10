/**
 * Company marketing entry → workspace routes (/for-companies CTAs and preview cards).
 */
import { COMPANY_HIRING_ROUTE } from "@/lib/company-hiring-dashboard";
import { COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_TALENT_POOL_ROUTE } from "@/lib/company-talent-pool";
import type { TranslationKey } from "@/lib/i18n";

export const COMPANY_ENTRY_DASHBOARD_ROUTE = COMPANY_HIRING_ROUTE;
export const COMPANY_ENTRY_B2B_CALCULATOR_ROUTE = "/calculator/b2b";
export const COMPANY_ENTRY_WAITLIST_ROUTE = "/waitlist";
export const COMPANY_ENTRY_CONTACT_ROUTE = "/contact";

export const COMPANY_ENTRY_MARKERS = {
  heroDashboard: "company-entry-hero-dashboard",
  heroTalentPool: "company-entry-hero-talent-pool",
  heroCalculator: "company-entry-hero-calculator",
  heroWishlist: "company-entry-hero-wishlist",
  heroContact: "company-entry-hero-contact",
  workspacePreview: "company-entry-workspace-preview",
} as const;

export type CompanyEntryPreviewCardId = "dashboard" | "talent_pool" | "integrations" | "calculator";

export type CompanyEntryPreviewCard = {
  id: CompanyEntryPreviewCardId;
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  ctaKey: TranslationKey;
  marker: string;
};

export const COMPANY_ENTRY_PREVIEW_CARDS: readonly CompanyEntryPreviewCard[] = [
  {
    id: "dashboard",
    href: COMPANY_ENTRY_DASHBOARD_ROUTE,
    titleKey: "companyEntry.previewDashboardTitle",
    descKey: "companyEntry.previewDashboardDesc",
    ctaKey: "companyEntry.previewDashboardCta",
    marker: "company-entry-preview-dashboard",
  },
  {
    id: "talent_pool",
    href: COMPANY_TALENT_POOL_ROUTE,
    titleKey: "companyEntry.previewTalentPoolTitle",
    descKey: "companyEntry.previewTalentPoolDesc",
    ctaKey: "companyEntry.previewTalentPoolCta",
    marker: "company-entry-preview-talent-pool",
  },
  {
    id: "integrations",
    href: COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
    titleKey: "companyEntry.previewIntegrationsTitle",
    descKey: "companyEntry.previewIntegrationsDesc",
    ctaKey: "companyEntry.previewIntegrationsCta",
    marker: "company-entry-preview-integrations",
  },
  {
    id: "calculator",
    href: COMPANY_ENTRY_B2B_CALCULATOR_ROUTE,
    titleKey: "companyEntry.previewCalculatorTitle",
    descKey: "companyEntry.previewCalculatorDesc",
    ctaKey: "companyEntry.previewCalculatorCta",
    marker: "company-entry-preview-calculator",
  },
] as const;

/** Canonical company workspace back-links surfaced from talent pool footer. */
export const COMPANY_TALENT_POOL_BACK_LINKS = {
  dashboard: COMPANY_ENTRY_DASHBOARD_ROUTE,
  integrations: COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  roles: COMPANY_ROLES_ROUTE,
  pipeline: "/company/pipeline",
} as const;
