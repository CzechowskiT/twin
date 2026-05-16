"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <article className="twin-prose mx-auto max-w-3xl py-10 sm:py-14">
        <h1>{t("site.contactTitle")}</h1>
        <p className="lead text-[var(--twin-muted-strong)]">{t("site.contactLead")}</p>
        <h2>{t("site.contactGeneralTitle")}</h2>
        <p>{t("site.contactGeneralBody")}</p>
        <h2>{t("site.contactSalesTitle")}</h2>
        <p>{t("site.contactSalesBody")}</p>
        <h2>{t("site.contactPressTitle")}</h2>
        <p>{t("site.contactPressBody")}</p>
        <h2>{t("site.contactOfficeTitle")}</h2>
        <p>{t("site.contactOfficeBody")}</p>
        <p className="text-sm text-[var(--twin-muted)]">
          <Link href="/media" className="twin-link font-medium">
            {t("nav.media")}
          </Link>
          {" · "}
          <Link href="/partners" className="twin-link font-medium">
            {t("nav.partners")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}
