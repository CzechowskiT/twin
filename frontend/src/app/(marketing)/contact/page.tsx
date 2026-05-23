"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("site.contactTitle")} lead={t("site.contactLead")} />
        <article className="twin-prose twin-prose--solid mt-8 max-w-none">
          <h2>{t("site.contactGeneralTitle")}</h2>
          <p>{t("site.contactGeneralBody")}</p>
          <h2>{t("site.contactSalesTitle")}</h2>
          <p>{t("site.contactSalesBody")}</p>
          <h2>{t("site.contactPressTitle")}</h2>
          <p>{t("site.contactPressBody")}</p>
          <h2>{t("site.contactOfficeTitle")}</h2>
          <p>{t("site.contactOfficeBody")}</p>
          <p className="text-sm text-[var(--twin-muted-strong)]">
            <Link href="/media" className="twin-link font-medium">
              {t("nav.media")}
            </Link>
            {" · "}
            <Link href="/partners" className="twin-link font-medium">
              {t("nav.partners")}
            </Link>
          </p>
        </article>
      </MarketingPageSurface>
    </Shell>
  );
}
