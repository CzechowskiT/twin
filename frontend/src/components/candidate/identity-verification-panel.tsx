"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { CandidateIdentityVerificationRecord } from "@/lib/candidate-identity-verification-demo-data";
import {
  CANDIDATE_IDENTITY_VERIFICATION_MARKERS,
  candidateIdentityVerificationHref,
} from "@/lib/candidate-identity-verification";

type IdentityVerificationPanelProps = {
  record: CandidateIdentityVerificationRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function IdentityVerificationPanel({
  record,
  marker = CANDIDATE_IDENTITY_VERIFICATION_MARKERS.disabledActions,
  compact = false,
  showFullPageLink = true,
}: IdentityVerificationPanelProps) {
  const { t } = useTranslation();
  const actions = record.bundle.disabled_actions.slice(0, compact ? 2 : undefined);
  const dataFields = record.bundle.data_shared_preview.slice(0, compact ? 2 : undefined);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact
          ? t("candidateIdentityVerification.panelLeadCompact")
          : t("candidateIdentityVerification.panelLead")}
      </p>
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 text-sm leading-relaxed text-[var(--foreground)]"
        data-testid={`${marker}-status-warning`}
      >
        <p className="font-semibold">{t("dashboard.identityPilotNotice")}</p>
        <p className="mt-2">{t("dashboard.identityNotConfigured")}</p>
      </div>
      {!compact ? (
        <ul className="space-y-2">
          {dataFields.map((field) => (
            <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
              <p className="font-medium">{field.label}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{field.description}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
          data-testid={CANDIDATE_IDENTITY_VERIFICATION_MARKERS.startDisabled}
        >
          {t("candidateIdentityVerification.startDisabledCta")}
        </button>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled
            className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50 text-xs"
            data-testid={`${marker}-action-${action.id}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      {showFullPageLink ? (
        <Link
          href={candidateIdentityVerificationHref()}
          className="twin-link text-xs font-medium"
          data-testid={`${marker}-full-page-link`}
        >
          {t("candidateIdentityVerification.linkFullPage")}
        </Link>
      ) : null}
      <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateIdentityVerification.demoOnlyHint")}</p>
    </div>
  );
}
