"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  EXPORT_REQUEST_TYPES,
  EXPORT_REQUESTS_MARKERS,
  EXPORT_REQUESTS_PAGE_MARKER,
  createExportRequestRecord,
  exportRequestsHref,
  loadExportRequests,
  resolveExportRequests,
  type ExportRequestRow,
  type SafePersistenceSource,
} from "@/lib/export-requests";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";

export function ExportRequestsWorkspace() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExportRequestRow[]>(() => resolveExportRequests());
  const [source, setSource] = useState<SafePersistenceSource>("demo");
  const [writeStatus, setWriteStatus] = useState<"idle" | "live" | "demo">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadExportRequests().then((res) => {
      if (!active) return;
      setItems(res.items);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";
  const writeKey =
    writeStatus === "live"
      ? "safePersistence.internalWriteLive"
      : writeStatus === "demo"
        ? "safePersistence.internalWriteDemo"
        : null;

  async function onCreate(): Promise<void> {
    setSaving(true);
    setWriteStatus("idle");
    const result = await createExportRequestRecord(EXPORT_REQUEST_TYPES.candidateExportPreview);
    if (result.wrote && result.data) {
      setItems((prev) => [
        {
          id: String(result.data!.id),
          request_type: result.data!.request_type,
          candidate_id: result.data!.candidate_id,
          status: result.data!.status,
        },
        ...prev,
      ]);
      setSource("live");
      setWriteStatus("live");
    } else {
      setWriteStatus("demo");
    }
    setSaving(false);
  }

  return (
    <Shell wide rail>
      <div data-export-requests-page={EXPORT_REQUESTS_PAGE_MARKER} data-testid={EXPORT_REQUESTS_MARKERS.page} className="mx-auto max-w-4xl space-y-6">
        <header data-testid={EXPORT_REQUESTS_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("exportRequests.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("exportRequests.headerLead")}</p>
          <p className="text-xs text-[var(--twin-muted)]" data-testid={EXPORT_REQUESTS_MARKERS.dataSource}>
            {t(sourceKey)}
          </p>
          <Link href={candidateControlCenterHref()} className="twin-link text-xs">{t("exportRequests.linkControlCenter")}</Link>
        </header>
        <Card className="p-4" data-testid={EXPORT_REQUESTS_MARKERS.list}>
          <p className="mb-2 text-xs">{t("exportRequests.listLead")}</p>
          <ul className="space-y-1 text-xs">
            {items.map((row) => (
              <li key={row.id} className="rounded border px-2 py-1 font-mono">
                {row.request_type} · {row.status} · {row.candidate_id}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4" data-testid={EXPORT_REQUESTS_MARKERS.createForm}>
          <p className="text-xs">{t("exportRequests.createLead")}</p>
          <button
            type="button"
            className="twin-touch-target mt-2 rounded border px-3 py-1.5 text-xs disabled:opacity-50"
            onClick={() => void onCreate()}
            disabled={saving}
          >
            {t("exportRequests.queueAction")}
          </button>
          {writeKey ? (
            <p className="mt-2 text-[10px] text-[var(--twin-muted)]" data-testid={EXPORT_REQUESTS_MARKERS.writeStatus}>
              {t(writeKey)}
            </p>
          ) : null}
        </Card>
        <Card className="p-4" data-testid={EXPORT_REQUESTS_MARKERS.boundary}>
          <p className="text-xs">{t("exportRequests.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}

export { exportRequestsHref };
