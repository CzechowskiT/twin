import type { TranslationKey } from "@/lib/i18n";

export function calendarProviderLabel(
  provider: string | null | undefined,
  t: (key: TranslationKey) => string,
): string {
  const p = (provider || "google").trim().toLowerCase();
  if (p === "microsoft") return t("dashboard.calendarProviderMicrosoft");
  if (p === "google") return t("dashboard.calendarProviderGoogle");
  return p;
}
