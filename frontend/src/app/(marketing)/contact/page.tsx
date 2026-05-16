"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
        <h1>{t("site.contactTitle")}</h1>
        <p className="lead">{t("site.contactLead")}</p>
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
