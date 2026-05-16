"use client";

import Link from "next/link";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function PartnersPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface>
        <article className="twin-prose twin-prose--solid max-w-none">
        <h1>{t("site.partnersTitle")}</h1>
        <p className="lead">{t("site.partnersLead")}</p>
        <p>{t("site.partnersBody")}</p>
        <p className="text-sm italic text-[var(--twin-muted-strong)]">{t("site.partnersNote")}</p>
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
