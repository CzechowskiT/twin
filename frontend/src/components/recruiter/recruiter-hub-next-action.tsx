"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

/** Single honest CTA when hub promo cards are gated off (Product Polish P1). */
export function RecruiterHubNextAction() {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="mt-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
      data-testid="recruiter-hub-next-action"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("recruiterHub.nextActionEyebrow")}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("recruiterHub.nextActionTitle")}</h2>
      <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("recruiterHub.nextActionLead")}</p>
      <Link
        href="/recruiter/inbox"
        className="twin-btn-primary twin-touch-target mt-4 inline-flex"
      >
        {t("recruiterHub.nextActionCta")}
      </Link>
    </Card>
  );
}
