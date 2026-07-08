import {
  brandLogoUrls,
  shouldUseInitialsOnlyLogo,
  type Brand,
} from "@/lib/brand-logo-urls";

/** Slugs that must never appear on the public marketing marquee (initials-only plates). */
export const PUBLIC_MARQUEE_EXCLUDED_INITIALS_SLUGS = [
  "citi",
  "morganstanley",
  "capitalone",
  "costco",
  "homedepot",
  "lowes",
  "pepsi",
  "chevron",
  "exxonmobil",
  "servicenow",
] as const;

/** True when a partner has at least one configured logo URL for the public marquee. */
export function hasPublicLogoAsset(partner: Brand): boolean {
  if (shouldUseInitialsOnlyLogo(partner.domain)) {
    return false;
  }
  return brandLogoUrls(partner).length > 0;
}

/** True when SafeCompanyLogo would paint initials-only (no verified asset). */
export function isInitialsFallbackLogo(partner: Brand): boolean {
  return !hasPublicLogoAsset(partner);
}

/** Public marquee partners — verified logo assets only, no initials-only cards. */
export function getPublicMarqueeLogos(partners: readonly Brand[]): Brand[] {
  return partners.filter(hasPublicLogoAsset);
}
