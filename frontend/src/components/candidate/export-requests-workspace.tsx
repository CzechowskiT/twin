"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { EXPORT_REQUESTS_MARKERS, EXPORT_REQUESTS_PAGE_MARKER, exportRequestsHref } from "@/lib/export-requests";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";

export function ExportRequestsWorkspace() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-export-requests-page={EXPORT_REQUESTS_PAGE_MARKER} data-testid={EXPORT_REQUESTS_MARKERS.page} className="mx-auto max-w-4xl space-y-6">
        <header data-testid={EXPORT_REQUESTS_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("exportRequests.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("exportRequests.headerLead")}</p>
          <Link href={candidateControlCenterHref()} className="twin-link text-xs">{t("exportRequests.linkControlCenter")}</Link>
        </header>
        <Card className="p-4" data-testid={EXPORT_REQUESTS_MARKERS.list}>
          <p className="text-xs">{t("exportRequests.listLead")}</p>
        </Card>
        <Card className="p-4" data-testid={EXPORT_REQUESTS_MARKERS.boundary}>
          <p className="text-xs">{t("exportRequests.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}

export { exportRequestsHref };
