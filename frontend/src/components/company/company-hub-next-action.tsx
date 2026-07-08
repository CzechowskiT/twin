"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { COMPANY_HUB_NEXT_ACTION_HREF } from "@/lib/seven-day-d4-company";

/** Single honest CTA when company hub promo cards are gated off (Seven-day D4). */
export function CompanyHubNextAction() {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="mb-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
      data-testid="company-hub-next-action"
      data-seven-day-company-hub-next-action
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("companyHub.nextActionEyebrow")}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("companyHub.nextActionTitle")}</h2>
      <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("companyHub.nextActionLead")}</p>
      <Link
        href={COMPANY_HUB_NEXT_ACTION_HREF}
        className="twin-btn-primary twin-touch-target mt-4 inline-flex"
      >
        {t("companyHub.nextActionCta")}
      </Link>
    </Card>
  );
}
