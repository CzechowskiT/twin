import { defaultCurrencyForLocale, numberFormatLocaleForUi } from "@/lib/calculator-currencies";
import { isLocale, type Locale } from "@/lib/i18n";

/** ISO 3166-1 alpha-2 → UI / marketing locale when geolocation refines region. */
const MARKETING_LOCALE_BY_COUNTRY: Partial<Record<string, Locale>> = {
  PL: "pl",
  DE: "de",
  FR: "fr",
  ES: "es",
  IT: "it",
  JP: "ja",
  CN: "zh",
  AE: "ar",
  US: "en",
  GB: "en",
  UK: "en",
};

/** Suggest pricing / marketing locale from a detected country code (null = keep current UI locale). */
export function marketingLocaleForCountryCode(countryCode: string | null | undefined): Locale | null {
  const cc = (countryCode ?? "").trim().toUpperCase();
  if (!cc) return null;
  return MARKETING_LOCALE_BY_COUNTRY[cc] ?? null;
}

/** Locale → ISO 4217 for marketing MSRP (aligned with calculator defaults). */
export function marketingCurrencyForLocale(locale: string): string {
  return isLocale(locale) ? defaultCurrencyForLocale(locale) : "USD";
}

/** Illustrative tier MSRP amounts (same headline number across USD/EUR/PLN where applicable). */
export const TIER_MSRP_AMOUNT: Partial<Record<string, number>> = {
  premium: 49,
  pro: 99,
  sourcer: 149,
  talent: 399,
  rpo: 990,
  growth: 2900,
  scale: 7900,
};

const NON_NUMERIC_PRICE = new Set(["0", "—", "Custom", "Indywidualnie", "Invite", "Zaproszenie"]);

export function formatMarketingMsrp(amount: number, locale: string): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const currency = defaultCurrencyForLocale(loc);
  const nfLocale = numberFormatLocaleForUi(loc);
  return new Intl.NumberFormat(nfLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Localize a tier headline price when it maps to a known MSRP tier id. */
export function localizeTierPrice(
  tierId: string,
  price: string,
  locale: string,
): string {
  if (NON_NUMERIC_PRICE.has(price.trim())) return price;
  const amount = TIER_MSRP_AMOUNT[tierId];
  if (amount == null) return price;
  return formatMarketingMsrp(amount, locale);
}
