"use client";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import type { MarketingPersona } from "@/lib/marketing-persona";
import type { TranslationKey } from "@/lib/i18n";

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

/** Read-only session lane indicator — switching roles requires logout + zone login. */
export function PersonaBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();

  return (
    <span
      className={`twin-persona-badge inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-2 py-1.5 shadow-sm sm:gap-2 sm:px-2.5 sm:py-2 ${className ?? ""}`}
      title={t("nav.logoutToSwitchRole")}
      aria-label={`${t("nav.ariaPersonaNav")}: ${t(PERSONA_LABEL_KEY[persona])}. ${t("nav.logoutToSwitchRole")}`}
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
    </span>
  );
}
