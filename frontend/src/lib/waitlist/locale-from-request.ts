import { isLocale, type Locale } from "@/lib/i18n";

/** Best-effort locale from Accept-Language (SSR / OG crawlers). */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header?.trim()) return "en";
  const tags = header.split(",").map((part) => part.trim().split(";")[0]?.toLowerCase() ?? "");
  for (const raw of tags) {
    if (!raw) continue;
    if (raw.startsWith("zh")) return "zh";
    if (raw.startsWith("ar")) return "ar";
    const primary = raw.split("-")[0] ?? raw;
    if (isLocale(primary)) return primary;
    if (isLocale(raw)) return raw;
  }
  return "en";
}
