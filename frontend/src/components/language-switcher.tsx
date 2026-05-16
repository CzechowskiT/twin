"use client";

import { useTranslation } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      className="inline-flex items-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-0.5 text-xs font-semibold shadow-sm"
      role="group"
      aria-label={t("common.language")}
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            className={`twin-touch-target min-w-[2.25rem] rounded-md px-2.5 py-1.5 transition ${
              active
                ? "bg-[var(--twin-accent)] text-white hover:bg-[var(--twin-accent-hover)] hover:text-white"
                : "text-[var(--twin-muted-strong)] hover:text-[var(--twin-link)]"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
