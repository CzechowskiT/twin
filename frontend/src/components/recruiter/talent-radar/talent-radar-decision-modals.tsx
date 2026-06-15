"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  talentRadarInboxHighlightHref,
  RECRUITER_TALENT_RADAR_MARKERS,
  type TalentRadarCandidate,
} from "@/lib/recruiter-talent-radar";
import {
  TALENT_RADAR_DISMISS_REASON_CODES,
  TALENT_RADAR_DECISION_MARKERS,
  TALENT_RADAR_SNOOZE_DAYS,
  type TalentRadarDismissReasonCode,
  type TalentRadarSnoozeDays,
} from "@/lib/recruiter-talent-radar-decisions";
import { Card } from "@/components/ui";

export function TalentRadarSnoozeModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (days: TalentRadarSnoozeDays) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card
        variant="soft"
        className="w-full max-w-md p-5"
        data-testid={TALENT_RADAR_DECISION_MARKERS.snoozeModal}
      >
        <p className="text-sm font-semibold">{t("recruiterTalentRadar.snoozeModalTitle")}</p>
        <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.snoozeModalBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TALENT_RADAR_SNOOZE_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              className="twin-btn-ghost text-sm"
              disabled={saving}
              onClick={() => onConfirm(days)}
            >
              {t(`recruiterTalentRadar.snoozeDays_${days}` as TranslationKey)}
            </button>
          ))}
        </div>
        <button type="button" className="twin-btn-ghost mt-4 text-sm" onClick={onClose} disabled={saving}>
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </Card>
    </div>
  );
}

export function TalentRadarDismissModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: TalentRadarDismissReasonCode) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card
        variant="soft"
        className="w-full max-w-md p-5"
        data-testid={TALENT_RADAR_DECISION_MARKERS.dismissModal}
      >
        <p className="text-sm font-semibold">{t("recruiterTalentRadar.dismissModalTitle")}</p>
        <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.dismissModalBody")}</p>
        <div className="mt-4 space-y-2">
          {TALENT_RADAR_DISMISS_REASON_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className="block w-full rounded-lg border border-[var(--twin-border)] px-3 py-2 text-left text-sm hover:border-[var(--twin-accent)]/40"
              disabled={saving}
              onClick={() => onConfirm(code)}
            >
              {t(`recruiterTalentRadar.dismissReason_${code}` as TranslationKey)}
            </button>
          ))}
        </div>
        <button type="button" className="twin-btn-ghost mt-4 text-sm" onClick={onClose} disabled={saving}>
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </Card>
    </div>
  );
}

export function TalentRadarDraftModal({
  open,
  row,
  roleTitle,
  draftText,
  auditWarning,
  onClose,
  onReviewCardOpen,
}: {
  open: boolean;
  row: TalentRadarCandidate | null;
  roleTitle: string;
  draftText: string;
  auditWarning?: boolean;
  onClose: () => void;
  onReviewCardOpen?: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!open || !row) return null;

  const role = roleTitle || row.job_title || t("recruiterTalentRadar.draftRoleFallback");
  const why = row.why_surfaced.slice(0, 2).join("; ");

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid={TALENT_RADAR_DECISION_MARKERS.draftModal}
    >
      <Card
        variant="soft"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-amber-500/30 p-5"
        data-testid={RECRUITER_TALENT_RADAR_MARKERS.draftPanel}
      >
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t("recruiterTalentRadar.draftTitle")}
        </p>
        <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.draftDisclaimer")}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {t("recruiterTalentRadar.draftCandidateLabel")}
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--foreground)]">{row.display_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {t("recruiterTalentRadar.draftRoleContext")}
            </dt>
            <dd className="mt-0.5 text-[var(--foreground)]">{role}</dd>
          </div>
          {why ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("recruiterTalentRadar.draftWhyReachingOut")}
              </dt>
              <dd className="mt-0.5 text-[var(--foreground)]">{why}</dd>
            </div>
          ) : null}
        </dl>

        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--twin-surface)] p-4 text-sm leading-relaxed">
          {draftText}
        </pre>

        <p className="twin-muted mt-3 text-xs">{t("recruiterTalentRadar.draftRecruiterReviewNote")}</p>

        {auditWarning ? (
          <p
            className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            data-testid={TALENT_RADAR_DECISION_MARKERS.draftAuditWarning}
          >
            {t("recruiterTalentRadar.draftAuditFailed")}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="twin-btn-solid text-sm"
            data-testid={TALENT_RADAR_DECISION_MARKERS.draftCopyButton}
            onClick={() => void copyDraft()}
          >
            {copied ? t("recruiterTalentRadar.draftCopied") : t("recruiterTalentRadar.draftCopy")}
          </button>
          <button type="button" className="twin-btn-ghost text-sm" onClick={onClose}>
            {t("recruiterTalentRadar.draftClose")}
          </button>
          {onReviewCardOpen ? (
            <Link
              href={talentRadarInboxHighlightHref(Number(row.application_id ?? row.id))}
              className="twin-btn-ghost text-sm"
              onClick={() => onReviewCardOpen()}
            >
              {t("recruiterTalentRadar.ctaReviewCard")}
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
