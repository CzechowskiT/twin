"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { CandidateRevokeDeleteRecord } from "@/lib/candidate-revoke-delete-demo-data";
import {
  CANDIDATE_REVOKE_DELETE_MARKERS,
  candidateRevokeDeleteHref,
} from "@/lib/candidate-revoke-delete";

type RevokeDeletePanelProps = {
  record: CandidateRevokeDeleteRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function RevokeDeletePanel({
  record,
  marker = CANDIDATE_REVOKE_DELETE_MARKERS.draftRequest,
  compact = false,
  showFullPageLink = true,
}: RevokeDeletePanelProps) {
  const { t } = useTranslation();
  const drafts = record.bundle.draft_request.fields.slice(0, compact ? 2 : undefined);
  const included = record.included_items.slice(0, compact ? 2 : 4);
  const requestTypes = record.bundle.request_type_options.slice(0, compact ? 2 : 5);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact ? t("candidateRevokeDelete.panelLeadCompact") : t("candidateRevokeDelete.panelLead")}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted)]">
        {t("candidateRevokeDelete.requestTypeLabel")}: {record.bundle.draft_request.request_type} · backend_write:{" "}
        {String(record.bundle.draft_request.backend_write)}
      </p>
      <ul className="flex flex-wrap gap-2">
        {requestTypes.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-[var(--twin-border)]/60 px-2 py-1 text-[10px] opacity-50"
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
      <ul className="list-inside list-disc space-y-1 text-xs text-[var(--twin-muted-strong)]">
        {included.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ul className="space-y-3">
        {drafts.map((field) => (
          <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
            <p className="font-medium">{field.field_label}</p>
            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{field.preview_value}</p>
            <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{field.note}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
          data-testid={`${marker}-submit`}
        >
          {t("candidateRevokeDelete.submitDisabledCta")}
        </button>
        {showFullPageLink ? (
          <Link
            href={candidateRevokeDeleteHref()}
            className="twin-link text-xs font-medium"
            data-testid={`${marker}-full-page-link`}
          >
            {t("candidateRevokeDelete.linkFullPage")}
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateRevokeDelete.demoOnlyHint")}</p>
    </div>
  );
}
