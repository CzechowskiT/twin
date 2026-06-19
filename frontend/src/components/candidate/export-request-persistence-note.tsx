"use client";

import { useTranslation } from "@/components/language-provider";
import { EXPORT_REQUESTS_MARKERS } from "@/lib/export-requests";

type Props = { testId?: string };

export function ExportRequestPersistenceNote({ testId = EXPORT_REQUESTS_MARKERS.persistenceNote }: Props) {
  const { t } = useTranslation();
  return (
    <p data-testid={testId} className="rounded border border-dashed px-3 py-2 text-xs text-[var(--twin-muted-strong)]">
      {t("exportRequests.inlineNote")}
    </p>
  );
}
