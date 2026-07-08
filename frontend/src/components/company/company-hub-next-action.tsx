"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

/** Single calm CTA when company hub promo cards are gated off (Product Polish P5). */
export function CompanyHubNextAction() {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="mb-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
      data-testid="company-hub-next-action"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("companyHub.nextActionEyebrow")}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("companyHub.nextActionTitle")}</h2>
      <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("companyHub.nextActionLead")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/company/roles" className="twin-btn-primary twin-touch-target inline-flex">
          {t("companyHub.nextActionRolesCta")}
        </Link>
        <Link href="/company/pipeline" className="twin-btn-secondary twin-touch-target inline-flex">
          {t("companyHub.nextActionPipelineCta")}
        </Link>
      </div>
    </Card>
  );
}
