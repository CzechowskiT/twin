"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";

export function DemoPilotCta() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6" data-demo-pilot-cta>
      <p className="text-sm text-[var(--twin-muted-strong)]">{t("interactiveDemoPlayer.pilotCtaLead")}</p>
      <p className="mt-2 text-xs text-amber-200/90" data-pilot-stance="BLOCKED_BY_FOUNDER">
        {t("productPolish.externalEnrollmentBlocked")}
      </p>
      <Link href="/waitlist" className="twin-btn-primary twin-touch-target mt-4 inline-flex">
        {t("interactiveDemoPlayer.pilotCtaButton")}
      </Link>
    </section>
  );
}
