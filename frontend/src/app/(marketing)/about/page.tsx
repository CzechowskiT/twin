"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("site.aboutTitle")} lead={t("site.aboutLead")} />
        <article className="twin-prose twin-prose--solid mt-8 max-w-none">
          <p>{t("site.aboutP1")}</p>
          <p>{t("site.aboutP2")}</p>
          <h2>{t("site.aboutValuesTitle")}</h2>
          <h3>{t("site.aboutV1Title")}</h3>
          <p>{t("site.aboutV1Body")}</p>
          <h3>{t("site.aboutV2Title")}</h3>
          <p>{t("site.aboutV2Body")}</p>
          <h3>{t("site.aboutV3Title")}</h3>
          <p>{t("site.aboutV3Body")}</p>
          <p className="text-sm text-[var(--twin-muted-strong)]">
            <Link href="/contact" className="twin-link font-medium">
              {t("nav.contact")}
            </Link>
            {" · "}
            <Link href="/careers" className="twin-link font-medium">
              {t("nav.careers")}
            </Link>
          </p>
        </article>
      </MarketingPageSurface>
    </Shell>
  );
}
