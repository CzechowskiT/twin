"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { InteractiveDemoCta } from "@/components/marketing/interactive-demo-cta";
import { LandingLiveProof } from "@/components/marketing/landing-live-proof";

/** Register hub: same psychological hooks as homepage hero. */
export function RegisterHubConversion() {
  const { t } = useTranslation();

  return (
    <div className="register-hub-conversion mb-8 max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("register.hubCuriosity")}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">
        {t("register.hubBenefit")}
      </p>
      <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t("register.hubMicro")}</p>
      <LandingLiveProof className="mt-6 border-t border-[var(--twin-border)]/60 pt-6" />
      <InteractiveDemoCta className="mt-6 max-w-xl" />
    </div>
  );
}
