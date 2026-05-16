"use client";

import { useTranslation } from "@/components/language-provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--twin-muted-strong)]">
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        aria-label={t("common.language")}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="twin-touch-target max-w-[10.5rem] cursor-pointer truncate rounded border border-[var(--twin-border)] bg-[var(--twin-card)] py-1.5 ps-2 pe-7 text-xs font-semibold text-[var(--foreground)] shadow-sm sm:max-w-[12rem]"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
