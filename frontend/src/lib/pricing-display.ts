/**
 * Marketing list prices on persona pages: PLN when UI is Polish, USD otherwise
 * (aligned with language selection, not geolocation).
 */

/** Rough PLN per USD for illustrative MSRP only — not a live FX feed. */
const MARKETING_PLN_PER_USD = 4;

export function marketingListPriceUsesPln(locale: string): boolean {
  return locale === "pl";
}

/** Formats whole-number PLN MSRP for persona pricing cards. */
export function formatMarketingListPrice(locale: string, amountPln: number): string {
  if (marketingListPriceUsesPln(locale)) {
    if (amountPln === 0) return "0";
    return `${amountPln.toLocaleString("pl-PL")} PLN`;
  }
  const usd = Math.max(0, Math.round(amountPln / MARKETING_PLN_PER_USD));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}
