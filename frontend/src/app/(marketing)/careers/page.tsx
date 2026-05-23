"use client";

import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function CareersPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <MarketingPageHeader title={t("site.careersTitle")} lead={t("site.careersLead")} />
        <article className="twin-prose twin-prose--solid mt-8 max-w-none">
          <p>{t("site.careersIntro")}</p>
          <h2>{t("site.careersOpenTitle")}</h2>
          <p>{t("site.careersOpenBody")}</p>
          <h2>{t("site.careersPerksTitle")}</h2>
          <ul>
            <li>{t("site.careersPerk1")}</li>
            <li>{t("site.careersPerk2")}</li>
            <li>{t("site.careersPerk3")}</li>
          </ul>
          <Card className="not-prose mt-8">
            <p className="text-sm text-[var(--twin-muted-strong)]">
              <Link href="/contact" className="twin-link font-medium">
                {t("nav.contact")}
              </Link>
              {" · "}
              <Link href="/about" className="twin-link font-medium">
                {t("nav.about")}
              </Link>
            </p>
          </Card>
        </article>
      </MarketingPageSurface>
    </Shell>
  );
}
