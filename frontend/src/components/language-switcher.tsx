"use client";

import { useTranslation } from "@/components/language-provider";
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="inline-flex flex-wrap items-center justify-end gap-1 rounded-full border-2 border-neutral-300 bg-white p-1 shadow-[0_2px_12px_rgb(0_0_0_/0.08)]"
    >
      <span className="sr-only">{t("common.language")}</span>
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            title={LOCALE_LABELS[code]}
            aria-label={LOCALE_LABELS[code]}
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={`twin-touch-target flex h-10 w-10 items-center justify-center rounded-full text-[1.35rem] leading-none transition sm:h-11 sm:w-11 sm:text-[1.45rem] ${
              active
                ? "bg-white shadow-md ring-2 ring-[var(--twin-accent)] ring-offset-2 ring-offset-white"
                : "bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            <span aria-hidden>{LOCALE_FLAGS[code]}</span>
          </button>
        );
      })}
    </div>
  );
}
