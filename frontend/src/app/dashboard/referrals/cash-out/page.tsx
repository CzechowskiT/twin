"use client";

import { ReferralCashOutForm } from "@/components/referrals/referral-cash-out-form";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function ReferralCashOutPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("referrals.title")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("referrals.cashOutTitle")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("referrals.cashOutLead")}</p>
      </header>
      <ReferralCashOutForm />
    </Shell>
  );
}
