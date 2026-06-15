"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { COMPANY_TALENT_POOL_MARKERS } from "@/lib/company-talent-pool";
import type { CompanyTalentPoolNextBestAction } from "@/lib/company-talent-pool-next-best-action";

type CompanyTalentPoolNextActionProps = {
  action: CompanyTalentPoolNextBestAction;
};

export function CompanyTalentPoolNextAction({ action }: CompanyTalentPoolNextActionProps) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-emerald-500/20 bg-gradient-to-br from-[var(--twin-surface-2)]/80 to-emerald-500/5 p-5"
      data-testid={COMPANY_TALENT_POOL_MARKERS.nextBestAction}
      data-nba-code={action.code}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-accent)]">
        {t("companyTalentPool.nbaTitle")}
      </p>
      <h3 className="mt-2 text-base font-semibold">{t(action.titleKey)}</h3>
      <p className="twin-muted mt-2 text-sm leading-relaxed">{t(action.bodyKey)}</p>
      <Link href={action.href} className="twin-btn-solid twin-touch-target mt-4 inline-flex text-sm">
        {t(action.ctaKey)}
      </Link>
    </Card>
  );
}
