import { MARKETING_FX_PER_USD } from "@/lib/pricing-locale";

/** Units of local currency per 1 USD (static illustrative rates — see MARKETING_FX_PER_USD). */
export function fxUnitsPerUsd(currency: string): number {
  return MARKETING_FX_PER_USD[currency] ?? 1;
}

/** Model amounts are stored in USD; multiply for display in another currency. */
export function convertModelUsdToDisplay(usd: number, currency: string): number {
  return usd * fxUnitsPerUsd(currency);
}

/** Parse a user-facing amount in display currency back to model USD. */
export function convertDisplayToModelUsd(display: number, currency: string): number {
  const rate = fxUnitsPerUsd(currency);
  return rate > 0 ? display / rate : display;
}
