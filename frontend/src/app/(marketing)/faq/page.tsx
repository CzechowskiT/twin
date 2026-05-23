"use client";

import Link from "next/link";
import { Suspense } from "react";

import { FaqPageSections } from "@/components/marketing/faq-panel";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useTranslation } from "@/components/language-provider";
import { FAQ_TOTAL_QUESTIONS } from "@/lib/faq-messages";
import { Shell } from "@/components/ui";

export default function FaqPage() {
  const { t } = useTranslation();
  const metaLine = t("site.faqPageMeta").replace("{count}", String(FAQ_TOTAL_QUESTIONS));

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <ScrollReveal delayMs={0}>
          <MarketingPageHeader eyebrow={t("home.faqEyebrow")} title={t("site.faqPageTitle")} lead={t("site.faqPageLead")}>
            {metaLine ? <p className="text-sm text-[var(--twin-muted-strong)]">{metaLine}</p> : null}
            <p className="text-sm text-[var(--twin-muted-strong)]">
              <Link href="/" className="twin-link font-medium">
                {t("site.faqMoreHome")}
              </Link>
            </p>
          </MarketingPageHeader>
        </ScrollReveal>
        <div className="mt-10">
          <Suspense fallback={null}>
            <FaqPageSections />
          </Suspense>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
