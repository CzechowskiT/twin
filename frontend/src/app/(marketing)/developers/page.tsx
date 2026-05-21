"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function DevelopersPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("developers.title")}</h1>
        <p className="twin-muted mb-6 max-w-2xl text-sm leading-relaxed">{t("developers.lead")}</p>
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
    </Shell>
  );
}
