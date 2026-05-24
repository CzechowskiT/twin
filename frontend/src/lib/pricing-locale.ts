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

/** Global candidate list prices — USD is source of truth for Stripe + marketing. */
export const CANDIDATE_PLAN_USD_CENTS = {
  standby: 99,
  standard: 199,
  premium: 499,
  pro: 999,
} as const;

export const CANDIDATE_PLAN_USD = {
  standby: CANDIDATE_PLAN_USD_CENTS.standby / 100,
  standard: CANDIDATE_PLAN_USD_CENTS.standard / 100,
  premium: CANDIDATE_PLAN_USD_CENTS.premium / 100,
  pro: CANDIDATE_PLAN_USD_CENTS.pro / 100,
} as const;

export type CandidatePlanId = keyof typeof CANDIDATE_PLAN_USD;

/** Annual prepay discount vs paying 12× monthly (25% off → pay for 9 months, get 12). */
export const ANNUAL_PREPAY_DISCOUNT = 0.25;

/** USD annual prepay from monthly list price (e.g. Premium $4.99/mo → $44.91/yr). */
export function annualPrepayUsdFromMonthly(monthlyUsd: number): number {
  return Math.round(monthlyUsd * 12 * (1 - ANNUAL_PREPAY_DISCOUNT) * 100) / 100;
}

/** Effective monthly subscription revenue when a share of payers choose annual prepay. */
export function effectiveMonthlySubscriptionUsd(monthlyUsd: number, annualPrepayShare: number): number {
  const share = Math.min(1, Math.max(0, annualPrepayShare));
  return monthlyUsd * (1 - share * ANNUAL_PREPAY_DISCOUNT);
}

/**
 * Static illustrative FX: units of local currency per 1 USD (MVP; not live rates).
 * 2025-ish ballparks — PLN ~4.0, EUR ~0.92, GBP ~0.79, JPY ~150, CNY ~7.2, SAR ~3.75.
 */
export const MARKETING_FX_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  PLN: 4,
  GBP: 0.79,
  CNY: 7.2,
  JPY: 150,
  SAR: 3.75,
};

/** B2B / recruiter headline MSRP (PLN-native amounts in copy; localized with same numeric headline). */
export const TIER_MSRP_AMOUNT: Partial<Record<string, number>> = {
  sourcer: 149,
  talent: 399,
  rpo: 990,
  growth: 2900,
  scale: 7900,
};

const NON_NUMERIC_PRICE = new Set(["0", "—", "Custom", "Indywidualnie", "Invite", "Zaproszenie"]);

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

function usdMonthlyForPlan(planId: CandidatePlanId): number {
  return CANDIDATE_PLAN_USD[planId];
}

/** Charm-round converted monthly price (e.g. 19.99 PLN, €4.99). */
export function roundPsychMonthlyLocal(usdMonthly: number, currency: string): number {
  const rate = MARKETING_FX_PER_USD[currency] ?? 1;
  const raw = usdMonthly * rate;
  if (currency === "USD") return usdMonthly;
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    const step = raw >= 1000 ? 100 : 10;
    const rounded = Math.round(raw / step) * step;
    return Math.max(step - 1, rounded - 1);
  }
  const unit = Math.floor(raw);
  const withNinetyNine = unit + 0.99;
  if (withNinetyNine >= raw * 0.97) return withNinetyNine;
  return unit + 1 + 0.99;
}

function formatCurrencyAmount(
  amount: number,
  locale: string,
  currency: string,
  fractionDigits: number,
): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const nfLocale = numberFormatLocaleForUi(loc);
  const zeroDecimals = ZERO_DECIMAL_CURRENCIES.has(currency);
  const digits = zeroDecimals ? 0 : fractionDigits;
  return new Intl.NumberFormat(nfLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatPlanPrice(planId: CandidatePlanId, locale: string): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const currency = defaultCurrencyForLocale(loc);
  const nfLocale = numberFormatLocaleForUi(loc);
  const usdMonthly = usdMonthlyForPlan(planId);

  if (currency === "USD") {
    return formatCurrencyAmount(usdMonthly, locale, "USD", 2);
  }

  const amount = roundPsychMonthlyLocal(usdMonthly, currency);
  return formatCurrencyAmount(amount, locale, currency, 2);
}

/** Localized annual prepay price for a candidate plan (25% off 12× monthly). */
export function formatPlanAnnualPrice(planId: CandidatePlanId, locale: string): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const currency = defaultCurrencyForLocale(loc);
  const usdAnnual = annualPrepayUsdFromMonthly(usdMonthlyForPlan(planId));

  if (currency === "USD") {
    return formatCurrencyAmount(usdAnnual, locale, "USD", 2);
  }

  const monthlyLocal = roundPsychMonthlyLocal(usdMonthlyForPlan(planId), currency);
  const annualLocal = annualPrepayUsdFromMonthly(monthlyLocal);
  return formatCurrencyAmount(annualLocal, locale, currency, 2);
}

/** Localized annual prepay for any monthly USD list price (B2B seats, tiers). */
export function formatAnnualPrepayFromMonthlyUsd(monthlyUsd: number, locale: string): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const currency = defaultCurrencyForLocale(loc);
  const usdAnnual = annualPrepayUsdFromMonthly(monthlyUsd);

  if (currency === "USD") {
    return formatCurrencyAmount(usdAnnual, locale, "USD", monthlyUsd % 1 === 0 ? 0 : 2);
  }

  const monthlyLocal = roundPsychMonthlyLocal(monthlyUsd, currency);
  return formatCurrencyAmount(annualPrepayUsdFromMonthly(monthlyLocal), locale, currency, 2);
}

/** Format a USD list price from API (billing) for the active UI locale. */
export function formatCandidateListPriceUsd(usdMonthly: number, locale: string): string {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const nfLocale = numberFormatLocaleForUi(loc);
  const currency = defaultCurrencyForLocale(loc);

  if (!Number.isFinite(usdMonthly) || usdMonthly === 0) {
    return new Intl.NumberFormat(nfLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }

  if (Math.abs(usdMonthly - CANDIDATE_PLAN_USD.standby) < 0.001) {
    return formatPlanPrice("standby", locale);
  }
  if (Math.abs(usdMonthly - CANDIDATE_PLAN_USD.standard) < 0.001) {
    return formatPlanPrice("standard", locale);
  }
  if (Math.abs(usdMonthly - CANDIDATE_PLAN_USD.premium) < 0.001) {
    return formatPlanPrice("premium", locale);
  }
  if (Math.abs(usdMonthly - CANDIDATE_PLAN_USD.pro) < 0.001) {
    return formatPlanPrice("pro", locale);
  }

  if (currency === "USD") {
    return new Intl.NumberFormat(nfLocale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: usdMonthly % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(usdMonthly);
  }

  const amount = roundPsychMonthlyLocal(usdMonthly, currency);
  const zeroDecimals = ZERO_DECIMAL_CURRENCIES.has(currency);
  return new Intl.NumberFormat(nfLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(amount);
}

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
export function localizeTierPrice(tierId: string, price: string, locale: string): string {
  if (NON_NUMERIC_PRICE.has(price.trim())) return price;
  if (tierId === "standby" || tierId === "standard" || tierId === "premium" || tierId === "pro") {
    return formatPlanPrice(tierId, locale);
  }
  const amount = TIER_MSRP_AMOUNT[tierId];
  if (amount == null) return price;
  return formatMarketingMsrp(amount, locale);
}
