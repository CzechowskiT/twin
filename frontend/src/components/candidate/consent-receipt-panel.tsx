"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { CandidateConsentReceiptRecord } from "@/lib/candidate-consent-receipt-demo-data";
import {
  CANDIDATE_CONSENT_RECEIPT_FILENAME,
  CANDIDATE_CONSENT_RECEIPT_MARKERS,
  candidateConsentReceiptHref,
  downloadCandidateConsentReceiptJson,
} from "@/lib/candidate-consent-receipt";

type ConsentReceiptPanelProps = {
  record: CandidateConsentReceiptRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function ConsentReceiptPanel({
  record,
  marker = CANDIDATE_CONSENT_RECEIPT_MARKERS.download,
  compact = false,
  showFullPageLink = true,
}: ConsentReceiptPanelProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const jsonPreview = useMemo(
    () => JSON.stringify(record.bundle, null, 2).slice(0, compact ? 800 : 2400),
    [record.bundle, compact],
  );

  const handleDownload = useCallback(() => {
    setBusy(true);
    try {
      downloadCandidateConsentReceiptJson(record);
    } finally {
      queueMicrotask(() => setBusy(false));
    }
  }, [record]);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact ? t("candidateConsentReceipt.panelLeadCompact") : t("candidateConsentReceipt.panelLead")}
      </p>
      <ul className="list-inside list-disc space-y-1 text-xs text-[var(--twin-muted-strong)]">
        {record.bundle.covered_candidate_controls.slice(0, compact ? 4 : undefined).map((section) => (
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
          aria-label={t("candidateConsentReceipt.downloadAria")}
          onClick={handleDownload}
        >
          {busy ? "…" : t("candidateConsentReceipt.downloadCta")}
        </button>
        {showFullPageLink ? (
          <Link href={candidateConsentReceiptHref()} className="twin-link text-xs font-medium">
            {t("candidateConsentReceipt.linkFullPage")}
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">
        {t("candidateConsentReceipt.demoOnlyHint")} · {CANDIDATE_CONSENT_RECEIPT_FILENAME}
      </p>
    </div>
  );
}
