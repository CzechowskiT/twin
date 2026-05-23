/** Fictional global employer pricing demo (employer hub · Pricing tab). */

import type { JobEmployerMessageKey } from "@/lib/job-employer-messages";

export type PricingPlanId = "starter" | "growth" | "enterprise" | "global";

export type PricingPlan = {
  id: PricingPlanId;
  nameKey: JobEmployerMessageKey;
  usd: string;
  eur: string;
  /** Monthly list USD (for annual prepay display). Omit when usd is Custom. */
  monthlyUsd?: number;
  cadenceKey: JobEmployerMessageKey;
  highlight?: boolean;
};

function annualPrepayUsd(monthlyUsd: number): number {
  return Math.round(monthlyUsd * 12 * 0.75);
}

export function formatAnnualPrepayUsd(monthlyUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(annualPrepayUsd(monthlyUsd));
}

export type PricingFeatureRow = {
  id: string;
  labelKey: JobEmployerMessageKey;
  cells: Record<PricingPlanId, JobEmployerMessageKey>;
};

export type RolePricingExample = {
  id: string;
  roleKey: JobEmployerMessageKey;
  metricKey: JobEmployerMessageKey;
  valueKey: JobEmployerMessageKey;
  noteKey: JobEmployerMessageKey;
};

export type PricingAddon = {
  id: string;
  nameKey: JobEmployerMessageKey;
  priceKey: JobEmployerMessageKey;
  blurbKey: JobEmployerMessageKey;
};

export type RegionalPricingNote = {
  id: "emea" | "americas" | "apac";
  regionKey: JobEmployerMessageKey;
  noteKey: JobEmployerMessageKey;
  multiplierKey: JobEmployerMessageKey;
};

export type PricingFaqItem = {
  id: string;
  qKey: JobEmployerMessageKey;
  aKey: JobEmployerMessageKey;
};

export type TrustBadge = {
  id: string;
  nameKey: JobEmployerMessageKey;
  statusKey: JobEmployerMessageKey;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    nameKey: "pricingPlanStarter",
    usd: "$2,400",
    eur: "€2,200",
    monthlyUsd: 2400,
    cadenceKey: "pricingPerMonth",
  },
  {
    id: "growth",
    nameKey: "pricingPlanGrowth",
    usd: "$8,500",
    eur: "€7,800",
    monthlyUsd: 8500,
    cadenceKey: "pricingPerMonth",
    highlight: true,
  },
  {
    id: "enterprise",
    nameKey: "pricingPlanEnterprise",
    usd: "$24,000",
    eur: "€22,000",
    monthlyUsd: 24000,
    cadenceKey: "pricingPerMonth",
  },
  {
    id: "global",
    nameKey: "pricingPlanGlobal",
    usd: "Custom",
    eur: "Custom",
    cadenceKey: "pricingAnnualCommit",
  },
];

export const PRICING_FEATURE_ROWS: PricingFeatureRow[] = [
  {
    id: "seats",
    labelKey: "pricingFeatureSeats",
    cells: {
      starter: "pricingCellStarterSeats",
      growth: "pricingCellGrowthSeats",
      enterprise: "pricingCellEnterpriseSeats",
      global: "pricingCellGlobalSeats",
    },
  },
  {
    id: "regions",
    labelKey: "pricingFeatureRegions",
    cells: {
      starter: "pricingCellStarterRegions",
      growth: "pricingCellGrowthRegions",
      enterprise: "pricingCellEnterpriseRegions",
      global: "pricingCellGlobalRegions",
    },
  },
  {
    id: "ats",
    labelKey: "pricingFeatureAts",
    cells: {
      starter: "pricingCellStarterAts",
      growth: "pricingCellGrowthAts",
      enterprise: "pricingCellEnterpriseAts",
      global: "pricingCellGlobalAts",
    },
  },
  {
    id: "sso",
    labelKey: "pricingFeatureSso",
    cells: {
      starter: "pricingCellStarterSso",
      growth: "pricingCellGrowthSso",
      enterprise: "pricingCellEnterpriseSso",
      global: "pricingCellGlobalSso",
    },
  },
  {
    id: "csm",
    labelKey: "pricingFeatureCsm",
    cells: {
      starter: "pricingCellStarterCsm",
      growth: "pricingCellGrowthCsm",
      enterprise: "pricingCellEnterpriseCsm",
      global: "pricingCellGlobalCsm",
    },
  },
  {
    id: "sla",
    labelKey: "pricingFeatureSla",
    cells: {
      starter: "pricingCellStarterSla",
      growth: "pricingCellGrowthSla",
      enterprise: "pricingCellEnterpriseSla",
      global: "pricingCellGlobalSla",
    },
  },
  {
    id: "analytics",
    labelKey: "pricingFeatureAnalytics",
    cells: {
      starter: "pricingCellStarterAnalytics",
      growth: "pricingCellGrowthAnalytics",
      enterprise: "pricingCellEnterpriseAnalytics",
      global: "pricingCellGlobalAnalytics",
    },
  },
  {
    id: "whitelabel",
    labelKey: "pricingFeatureWhitelabel",
    cells: {
      starter: "pricingCellStarterWhitelabel",
      growth: "pricingCellGrowthWhitelabel",
      enterprise: "pricingCellEnterpriseWhitelabel",
      global: "pricingCellGlobalWhitelabel",
    },
  },
];

export const ROLE_PRICING_EXAMPLES: RolePricingExample[] = [
  {
    id: "r1",
    roleKey: "pricingRoleEngineer",
    metricKey: "pricingMetricCostPerHire",
    valueKey: "pricingValueEngineerHire",
    noteKey: "pricingNoteEngineer",
  },
  {
    id: "r2",
    roleKey: "pricingRoleRecruiter",
    metricKey: "pricingMetricSeatSubscription",
    valueKey: "pricingValueRecruiterSeat",
    noteKey: "pricingNoteRecruiter",
  },
  {
    id: "r3",
    roleKey: "pricingRoleCampus",
    metricKey: "pricingMetricCostPerHire",
    valueKey: "pricingValueCampusHire",
    noteKey: "pricingNoteCampus",
  },
  {
    id: "r4",
    roleKey: "pricingRoleExecutive",
    metricKey: "pricingMetricRetainer",
    valueKey: "pricingValueExecutive",
    noteKey: "pricingNoteExecutive",
  },
];

export const PRICING_ADDONS: PricingAddon[] = [
  { id: "campus", nameKey: "pricingAddonCampus", priceKey: "pricingAddonCampusPrice", blurbKey: "pricingAddonCampusBlurb" },
  {
    id: "exec",
    nameKey: "pricingAddonExecSearch",
    priceKey: "pricingAddonExecSearchPrice",
    blurbKey: "pricingAddonExecSearchBlurb",
  },
  {
    id: "contractor",
    nameKey: "pricingAddonContractor",
    priceKey: "pricingAddonContractorPrice",
    blurbKey: "pricingAddonContractorBlurb",
  },
  {
    id: "visa",
    nameKey: "pricingAddonVisa",
    priceKey: "pricingAddonVisaPrice",
    blurbKey: "pricingAddonVisaBlurb",
  },
];

export const REGIONAL_PRICING_NOTES: RegionalPricingNote[] = [
  { id: "emea", regionKey: "pricingRegionEmea", noteKey: "pricingRegionEmeaNote", multiplierKey: "pricingRegionEmeaMult" },
  {
    id: "americas",
    regionKey: "pricingRegionAmericas",
    noteKey: "pricingRegionAmericasNote",
    multiplierKey: "pricingRegionAmericasMult",
  },
  { id: "apac", regionKey: "pricingRegionApac", noteKey: "pricingRegionApacNote", multiplierKey: "pricingRegionApacMult" },
];

export const PRICING_FAQ_ITEMS: PricingFaqItem[] = [
  { id: "f1", qKey: "pricingFaq1Q", aKey: "pricingFaq1A" },
  { id: "f2", qKey: "pricingFaq2Q", aKey: "pricingFaq2A" },
  { id: "f3", qKey: "pricingFaq3Q", aKey: "pricingFaq3A" },
  { id: "f4", qKey: "pricingFaq4Q", aKey: "pricingFaq4A" },
  { id: "f5", qKey: "pricingFaq5Q", aKey: "pricingFaq5A" },
  { id: "f6", qKey: "pricingFaq6Q", aKey: "pricingFaq6A" },
];

export const PRICING_TRUST_BADGES: TrustBadge[] = [
  { id: "soc2", nameKey: "pricingTrustSoc2", statusKey: "pricingTrustSoc2Status" },
  { id: "gdpr", nameKey: "pricingTrustGdpr", statusKey: "pricingTrustGdprStatus" },
  { id: "iso", nameKey: "pricingTrustIso", statusKey: "pricingTrustIsoStatus" },
];
