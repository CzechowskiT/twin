"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
import {
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarModalOverlayClass,
  talentRadarModalPanelClass,
  talentRadarSecondaryCtaClass,
  talentRadarTertiaryCtaClass,
} from "@/lib/recruiter-talent-radar-visual";

function useModalA11y(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    initialFocusRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleClose]);

  return { dialogRef, initialFocusRef, handleClose };
}

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
  const titleId = useId();
  const { dialogRef, initialFocusRef, handleClose } = useModalA11y(open, onClose);
  if (!open) return null;

  return (
    <div className={talentRadarModalOverlayClass()} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${talentRadarModalPanelClass()} max-w-md`}
        data-testid={TALENT_RADAR_DECISION_MARKERS.snoozeModal}
      >
        <p id={titleId} className="text-sm font-semibold">
          {t("recruiterTalentRadar.snoozeModalTitle")}
        </p>
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
        <button
          ref={initialFocusRef}
          type="button"
          className={talentRadarTertiaryCtaClass() + " mt-4"}
          onClick={handleClose}
          disabled={saving}
        >
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </div>
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
  const titleId = useId();
  const { dialogRef, initialFocusRef, handleClose } = useModalA11y(open, onClose);
  if (!open) return null;

  return (
    <div className={talentRadarModalOverlayClass()} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${talentRadarModalPanelClass()} max-w-md`}
        data-testid={TALENT_RADAR_DECISION_MARKERS.dismissModal}
      >
        <p id={titleId} className="text-sm font-semibold">
          {t("recruiterTalentRadar.dismissModalTitle")}
        </p>
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
        <button
          ref={initialFocusRef}
          type="button"
          className={talentRadarTertiaryCtaClass() + " mt-4"}
          onClick={handleClose}
          disabled={saving}
        >
          {t("recruiterTalentRadar.modalCancel")}
        </button>
      </div>
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
  const titleId = useId();
  const trustId = useId();
  const { dialogRef, initialFocusRef, handleClose } = useModalA11y(open, onClose);

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
      className={talentRadarModalOverlayClass()}
      role="presentation"
      data-testid={TALENT_RADAR_DECISION_MARKERS.draftModal}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={trustId}
        className={`${talentRadarModalPanelClass()} border-amber-500/25`}
        data-testid={RECRUITER_TALENT_RADAR_MARKERS.draftPanel}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-[var(--foreground)]">
            {t("recruiterTalentRadar.draftTitle")}
          </h2>
          <span
            className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200"
            data-testid={TALENT_RADAR_VISUAL_MARKERS.draftCopyOnlyBadge}
          >
            {t("recruiterTalentRadar.draftCopyOnlyBadge")}
          </span>
        </div>

        <p className="twin-muted mt-2 text-xs">{t("recruiterTalentRadar.draftDisclaimer")}</p>

        <dl className="mt-5 space-y-3 text-sm">
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

        <pre
          className="mt-5 whitespace-pre-wrap rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 text-sm leading-relaxed text-[var(--foreground)]"
          data-testid={TALENT_RADAR_VISUAL_MARKERS.draftMessageBox}
        >
          {draftText}
        </pre>

        <p id={trustId} className="mt-4 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          {t("recruiterTalentRadar.draftRecruiterReviewNote")}
        </p>

        {auditWarning ? (
          <p
            className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            data-testid={TALENT_RADAR_DECISION_MARKERS.draftAuditWarning}
          >
            {t("recruiterTalentRadar.draftAuditFailed")}
          </p>
        ) : null}

        <div
          className="mt-6 flex flex-col gap-3 border-t border-[var(--twin-border)]/70 pt-5 sm:flex-row sm:flex-wrap sm:items-center"
          data-testid={TALENT_RADAR_VISUAL_MARKERS.draftCtaRow}
        >
          <button
            ref={initialFocusRef}
            type="button"
            className="twin-btn-solid text-sm font-semibold"
            data-testid={TALENT_RADAR_DECISION_MARKERS.draftCopyButton}
            onClick={() => void copyDraft()}
          >
            {copied ? t("recruiterTalentRadar.draftCopied") : t("recruiterTalentRadar.draftCopy")}
          </button>
          {onReviewCardOpen ? (
            <Link
              href={talentRadarInboxHighlightHref(Number(row.application_id ?? row.id))}
              className={talentRadarSecondaryCtaClass()}
              onClick={() => onReviewCardOpen()}
            >
              {t("recruiterTalentRadar.ctaReviewCard")}
            </Link>
          ) : null}
          <button type="button" className={talentRadarTertiaryCtaClass()} onClick={handleClose}>
            {t("recruiterTalentRadar.draftClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
