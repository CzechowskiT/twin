"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { FaqPanel } from "@/components/marketing/faq-panel";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { Shell } from "@/components/ui";

export default function FaqPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-3xl py-10 sm:py-14">
        <ScrollReveal delayMs={0}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">{t("home.faqEyebrow")}</p>
          <h1 className="twin-page-intro twin-section-title mt-2 text-2xl sm:text-3xl">{t("site.faqPageTitle")}</h1>
          <p className="mt-3 text-[var(--twin-muted-strong)]">{t("site.faqPageLead")}</p>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">
            <Link href="/" className="twin-link font-medium">
              {t("site.faqMoreHome")}
            </Link>
          </p>
        </ScrollReveal>
        <div className="mt-10">
          <FaqPanel />
        </div>
      </div>
    </Shell>
  );
}
