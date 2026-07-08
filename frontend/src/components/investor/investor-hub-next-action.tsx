"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { INVESTOR_HUB_NEXT_ACTION_HREF } from "@/lib/seven-day-d5-investor";

/** Single honest CTA when investor hub promos are simplified (Seven-day D5). */
export function InvestorHubNextAction() {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="mb-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
      data-testid="investor-hub-next-action"
      data-seven-day-investor-hub-next-action
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("sevenDayD5.investorHubNextActionEyebrow")}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("sevenDayD5.investorHubNextActionTitle")}</h2>
      <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("sevenDayD5.investorHubNextActionLead")}</p>
      <Link href={INVESTOR_HUB_NEXT_ACTION_HREF} className="twin-btn-primary twin-touch-target mt-4 inline-flex">
        {t("sevenDayD5.investorHubNextActionCta")}
      </Link>
    </Card>
  );
}
