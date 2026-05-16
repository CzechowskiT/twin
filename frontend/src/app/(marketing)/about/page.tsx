"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
        <h1>{t("site.aboutTitle")}</h1>
        <p className="lead">{t("site.aboutLead")}</p>
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
