"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function MediaPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
        <h1>{t("site.mediaTitle")}</h1>
        <p className="lead">{t("site.mediaLead")}</p>
        <h2>{t("site.mediaKitTitle")}</h2>
        <p>{t("site.mediaKitBody")}</p>
        <h2>{t("site.mediaCoverageTitle")}</h2>
        <p>{t("site.mediaCoverageBody")}</p>
        <p className="text-sm text-[var(--twin-muted-strong)]">
          <Link href="/contact" className="twin-link font-medium">
            {t("nav.contact")}
          </Link>
        </p>
      </article>
      </MarketingPageSurface>
    </Shell>
  );
}
