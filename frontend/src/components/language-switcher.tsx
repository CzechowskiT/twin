"use client";

import { useRef } from "react";

import { useTranslation } from "@/components/language-provider";
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from "@/lib/i18n";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" width="12" height="12" aria-hidden>
      <path d="M3 4.5h6L6 8 3 4.5z" fill="currentColor" />
    </svg>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const close = () => {
    const el = detailsRef.current;
    if (el) el.open = false;
  };

  const pick = (code: Locale) => {
    setLocale(code);
    close();
  };

  return (
    <details
      ref={detailsRef}
      className={`twin-lang-switcher relative shrink-0 ${className ?? ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <summary
        className="twin-touch-target flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-2 py-1.5 shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]/50 sm:gap-2 sm:px-2.5 sm:py-2 [&::-webkit-details-marker]:hidden"
        aria-label={`${t("common.language")}: ${LOCALE_LABELS[locale]}`}
      >
        <span className="text-[1.2rem] leading-none sm:text-[1.28rem]" aria-hidden>
          {LOCALE_FLAGS[locale]}
        </span>
        <span className="hidden max-w-[7rem] truncate text-xs font-semibold text-[var(--twin-muted-strong)] sm:inline sm:text-sm">
          {LOCALE_LABELS[locale]}
        </span>
        <ChevronIcon className="twin-lang-switcher-chevron shrink-0 text-[var(--twin-muted)] transition-transform duration-200" />
      </summary>

      <div
        className="absolute right-0 z-[70] mt-1.5 min-w-[min(100vw-2rem,15rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] py-1 shadow-[var(--twin-shadow-md)]"
        style={{ boxShadow: "var(--twin-shadow-md)" }}
        role="menu"
        aria-label={t("common.language")}
      >
        {LOCALES.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              role="menuitem"
              aria-current={active ? true : undefined}
              onClick={() => pick(code)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition sm:py-3 ${
                active
                  ? "bg-[var(--twin-accent-muted)]/80 font-semibold text-[var(--foreground)]"
                  : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-accent-muted)]/50"
              }`}
            >
              <span className="text-[1.25rem] leading-none" aria-hidden>
                {LOCALE_FLAGS[code]}
              </span>
              <span className="min-w-0 flex-1 truncate">{LOCALE_LABELS[code]}</span>
              {active ? (
                <span className="shrink-0 text-xs font-bold text-[var(--twin-accent)]" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="w-4 shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
}
