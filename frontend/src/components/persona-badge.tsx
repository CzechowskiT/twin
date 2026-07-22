"use client";

import { useRef } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import type { TranslationKey } from "@/lib/i18n";
import { MARKETING_PERSONAS, type MarketingPersona } from "@/lib/marketing-persona";
import { switchSessionPersonaWorkspace } from "@/lib/session-persona";

const PERSONA_LABEL_KEY: Record<MarketingPersona, TranslationKey> = {
  candidate: "nav.personaCandidate",
  recruiter: "nav.personaRecruiter",
  company: "nav.personaCompany",
  investor: "nav.personaInvestor",
};

const PERSONA_ICON: Record<MarketingPersona, string> = {
  candidate: "◆",
  recruiter: "◇",
  company: "▣",
  investor: "◎",
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" width="12" height="12" aria-hidden>
      <path d="M3 4.5h6L6 8 3 4.5z" fill="currentColor" />
    </svg>
  );
}

/**
 * Authenticated space/persona switcher in the workspace header.
 * Temporary: switches twin_session_persona and hard-loads that workspace home.
 */
export function PersonaBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const close = () => {
    const el = detailsRef.current;
    if (el) el.open = false;
  };

  const pick = (next: MarketingPersona) => {
    if (next === persona) {
      close();
      return;
    }
    close();
    switchSessionPersonaWorkspace(next);
  };

  return (
    <details
      ref={detailsRef}
      className={`twin-persona-badge twin-persona-switcher relative shrink-0 ${className ?? ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <summary
        className="twin-touch-target flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-2 py-1.5 shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]/50 sm:gap-2 sm:px-2.5 sm:py-2 [&::-webkit-details-marker]:hidden"
        aria-label={`${t("nav.switchPersona")}: ${t(PERSONA_LABEL_KEY[persona])}`}
        title={t("nav.switchPersona")}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--twin-accent-muted)] text-[10px] font-black text-[var(--twin-accent)]"
          aria-hidden
        >
          {PERSONA_ICON[persona]}
        </span>
        <span className="hidden max-w-[6.5rem] truncate text-xs font-semibold text-[var(--twin-muted-strong)] sm:inline sm:text-sm">
          {t(PERSONA_LABEL_KEY[persona])}
        </span>
        <ChevronIcon className="twin-persona-switcher-chevron shrink-0 text-[var(--twin-muted)] transition-transform duration-200" />
      </summary>

      <div
        className="absolute right-0 z-[70] mt-1.5 min-w-[min(100vw-2rem,15rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] py-1 shadow-[var(--twin-shadow-md)]"
        style={{ boxShadow: "var(--twin-shadow-md)" }}
        role="menu"
        aria-label={t("nav.switchPersona")}
      >
        {MARKETING_PERSONAS.map((key) => {
          const active = persona === key;
          return (
            <button
              key={key}
              type="button"
              role="menuitem"
              aria-current={active ? true : undefined}
              onClick={() => pick(key)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition sm:py-3 ${
                active
                  ? "bg-[var(--twin-accent-muted)]/80 font-semibold text-[var(--foreground)]"
                  : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-accent-muted)]/50"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--twin-accent-muted)]/70 text-xs font-black text-[var(--twin-accent)]"
                aria-hidden
              >
                {PERSONA_ICON[key]}
              </span>
              <span className="min-w-0 flex-1 truncate">{t(PERSONA_LABEL_KEY[key])}</span>
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
