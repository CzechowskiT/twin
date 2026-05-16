"use client";

import { useTranslation } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
];

type LanguageSwitcherProps = {
  variant?: "default" | "dark";
};

export function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();
  const dark = variant === "dark";

  const shell = dark
    ? "inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-sm"
    : "inline-flex items-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-0.5 text-xs font-semibold shadow-sm";

  return (
    <div className={shell} role="group" aria-label={t("common.language")}>
      {OPTIONS.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            className={`twin-touch-target min-w-[2.25rem] rounded-md px-2.5 py-1.5 transition ${
              dark
                ? active
                  ? "bg-white text-zinc-950 shadow-sm hover:bg-zinc-100"
                  : "text-zinc-400 hover:text-white"
                : active
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
