"use client";

import { ReferralsDashboard } from "@/components/referrals/referrals-dashboard";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function DashboardReferralsPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("referrals.title")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("referrals.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("referrals.lead")}</p>
        <p className="twin-muted max-w-2xl text-xs leading-relaxed">{t("referrals.rewardModelNote")}</p>
      </header>
      <ReferralsDashboard />
    </Shell>
  );
}
