import type { Locale } from "@/lib/i18n";

/** Minimum set if `Intl.supportedValuesOf("currency")` is unavailable. Covers site locales + CHF. */
const CALCULATOR_CURRENCY_FALLBACK: readonly string[] = [
  "AED",
  "ARS",
  "AUD",
  "BHD",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CZK",
  "DKK",
  "DZD",
  "EGP",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KRW",
  "KWD",
  "MAD",
  "MXN",
  "MYR",
  "NGN",
  "NOK",
  "NZD",
  "OMR",
  "PHP",
  "PKR",
  "PLN",
  "QAR",
  "RON",
  "RUB",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "USD",
  "ZAR",
] as const;

function _dedupeSorted(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of codes) {
    const u = c.toUpperCase();
    if (u.length !== 3 || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/** All ISO 4217 currency codes the environment exposes, else a broad fallback list. */
export function listCalculatorCurrencies(): string[] {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "currency") => string[] };
    const raw = intl.supportedValuesOf?.("currency");
    if (raw?.length) {
      return _dedupeSorted(raw);
    }
  } catch {
    // ignore
  }
  return _dedupeSorted([...CALCULATOR_CURRENCY_FALLBACK]);
}

/** Default display currency when the user has not chosen another. */
export function defaultCurrencyForLocale(locale: Locale): string {
  const map: Record<Locale, string> = {
    pl: "PLN",
    de: "EUR",
    es: "EUR",
    it: "EUR",
    fr: "EUR",
    zh: "CNY",
    ja: "JPY",
    ar: "SAR",
    en: "USD",
  };
  return map[locale] ?? "USD";
}

/** BCP 47 tag for `Intl.NumberFormat` / `DisplayNames` (currency labels). */
export function numberFormatLocaleForUi(locale: Locale): string {
  const map: Record<Locale, string> = {
    en: "en-US",
    pl: "pl-PL",
    es: "es-ES",
    it: "it-IT",
    fr: "fr-FR",
    de: "de-DE",
    zh: "zh-CN",
    ar: "ar-SA",
    ja: "ja-JP",
  };
  return map[locale] ?? "en-US";
}
