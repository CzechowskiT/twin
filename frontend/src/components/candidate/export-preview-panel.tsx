"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { CandidateExportPreviewRecord } from "@/lib/candidate-export-preview-demo-data";
import {
  CANDIDATE_EXPORT_PREVIEW_FILENAME,
  CANDIDATE_EXPORT_PREVIEW_MARKERS,
  candidateExportPreviewHref,
  downloadCandidateExportPreviewJson,
} from "@/lib/candidate-export-preview";

type ExportPreviewPanelProps = {
  record: CandidateExportPreviewRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function ExportPreviewPanel({
  record,
  marker = CANDIDATE_EXPORT_PREVIEW_MARKERS.download,
  compact = false,
  showFullPageLink = true,
}: ExportPreviewPanelProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const jsonPreview = useMemo(
    () => JSON.stringify(record.bundle, null, 2).slice(0, compact ? 800 : 2400),
    [record.bundle, compact],
  );

  const handleDownload = useCallback(() => {
    setBusy(true);
    try {
      downloadCandidateExportPreviewJson(record);
    } finally {
      queueMicrotask(() => setBusy(false));
    }
  }, [record]);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact ? t("candidateExportPreview.panelLeadCompact") : t("candidateExportPreview.panelLead")}
      </p>
      <ul className="list-inside list-disc space-y-1 text-xs text-[var(--twin-muted-strong)]">
        {record.included_sections.slice(0, compact ? 4 : undefined).map((section) => (
          <li key={section}>{section}</li>
        ))}
      </ul>
      {!compact ? (
        <pre
          className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-[var(--twin-border)]/60 bg-[var(--twin-surface)] p-3 text-[10px] leading-relaxed"
          data-testid={`${marker}-json-snippet`}
        >
          {jsonPreview}
          {jsonPreview.length >= 2400 ? "\n…" : ""}
        </pre>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target"
          disabled={busy}
          data-testid={`${marker}-button`}
          aria-label={t("candidateExportPreview.downloadAria")}
          onClick={handleDownload}
        >
          {busy ? "…" : t("candidateExportPreview.downloadCta")}
        </button>
        {showFullPageLink ? (
          <Link href={candidateExportPreviewHref()} className="twin-link text-xs font-medium">
            {t("candidateExportPreview.linkFullPage")}
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">
        {t("candidateExportPreview.demoOnlyHint")} · {CANDIDATE_EXPORT_PREVIEW_FILENAME}
      </p>
    </div>
  );
}
