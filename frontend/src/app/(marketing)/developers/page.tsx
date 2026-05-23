"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Card, Shell } from "@/components/ui";

export default function DevelopersPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("developers.title")} lead={t("developers.lead")} />
        <Card className="mt-8">
          <ul className="space-y-4 text-sm">
            <li>
              <a href="/api/openapi" className="twin-link font-medium" target="_blank" rel="noopener noreferrer">
                {t("developers.openapi")}
              </a>
              <p className="twin-muted mt-1">{t("developers.openapiHint")}</p>
            </li>
            <li>
              <Link href="/status" className="twin-link font-medium">
                {t("developers.status")}
              </Link>
              <p className="twin-muted mt-1">{t("developers.statusHint")}</p>
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)]">{t("developers.partnerApi")}</span>
              <p className="twin-muted mt-1">{t("developers.partnerApiHint")}</p>
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)]">{t("developers.scrapeOps")}</span>
              <p className="twin-muted mt-1">{t("developers.scrapeOpsHint")}</p>
            </li>
            <li>
              <a
                href="/api/v1/public/mvp-stats"
                className="twin-link font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("developers.mvpStats")}
              </a>
              <p className="twin-muted mt-1">{t("developers.mvpStatsHint")}</p>
            </li>
          </ul>
          <p className="twin-muted mt-8 text-xs">{t("developers.authNote")}</p>
        </Card>
      </MarketingPageSurface>
    </Shell>
  );
}
