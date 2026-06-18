"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { CandidateTrustAuditExportRecord } from "@/lib/candidate-trust-audit-export-demo-data";
import {
  CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME,
  CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS,
  candidateTrustAuditExportHref,
  downloadCandidateTrustAuditExportJson,
} from "@/lib/candidate-trust-audit-export";

type TrustAuditExportPanelProps = {
  record: CandidateTrustAuditExportRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function TrustAuditExportPanel({
  record,
  marker = CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.download,
  compact = false,
  showFullPageLink = true,
}: TrustAuditExportPanelProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const jsonPreview = useMemo(
    () => JSON.stringify(record.bundle, null, 2).slice(0, compact ? 800 : 2400),
    [record.bundle, compact],
  );

  const handleDownload = useCallback(() => {
    setBusy(true);
    try {
      downloadCandidateTrustAuditExportJson(record);
    } finally {
      queueMicrotask(() => setBusy(false));
    }
  }, [record]);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact ? t("candidateTrustAuditExport.panelLeadCompact") : t("candidateTrustAuditExport.panelLead")}
      </p>
      <ul className="list-inside list-disc space-y-1 text-xs text-[var(--twin-muted-strong)]">
        {record.bundle.included_scope.slice(0, compact ? 4 : undefined).map((section) => (
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
          aria-label={t("candidateTrustAuditExport.downloadAria")}
          onClick={handleDownload}
        >
          {busy ? "…" : t("candidateTrustAuditExport.downloadCta")}
        </button>
        {showFullPageLink ? (
          <Link href={candidateTrustAuditExportHref()} className="twin-link text-xs font-medium">
            {t("candidateTrustAuditExport.linkFullPage")}
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">
        {t("candidateTrustAuditExport.demoOnlyHint")} · {CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME}
      </p>
    </div>
  );
}
