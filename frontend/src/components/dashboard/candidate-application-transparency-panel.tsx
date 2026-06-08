"use client";

import { useTranslation } from "@/components/language-provider";

type Props = {
  status: string;
};

/** Application statuses where recruiter may have seen application_review data. */
function showApplicationTransparency(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "pending" || s === "applied" || s === "interview" || s === "rejected";
}

const SHARED_KEYS = [
  "dashboard.applicationTransparencyWeShowName",
  "dashboard.applicationTransparencyWeShowStatus",
  "dashboard.applicationTransparencyWeShowMatch",
  "dashboard.applicationTransparencyWeShowReviewCard",
  "dashboard.applicationTransparencyWeShowRoleInfo",
] as const;

const NOT_SHARED_KEYS = [
  "dashboard.applicationTransparencyNotShownPhone",
  "dashboard.applicationTransparencyNotShownEmail",
  "dashboard.applicationTransparencyNotShownCv",
  "dashboard.applicationTransparencyNotShownAddress",
  "dashboard.applicationTransparencyNotShownSensitive",
] as const;

/** Premium privacy control panel — static application_review visibility (no DB). */
export function CandidateApplicationTransparencyPanel({ status }: Props) {
  const { t } = useTranslation();
  if (!showApplicationTransparency(status)) return null;

  return (
    <details className="mt-3 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 text-xs">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
        {t("dashboard.applicationTransparencyTitle")}
      </summary>
      <div className="mt-3 space-y-3 leading-relaxed text-[var(--twin-muted-strong)]">
        <p className="text-sm">{t("dashboard.applicationTransparencyContext")}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/25 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
              {t("dashboard.applicationTransparencySharedColumn")}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {SHARED_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
              {t("dashboard.applicationTransparencyNotSharedColumn")}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {NOT_SHARED_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[var(--twin-muted)]">{t("dashboard.applicationTransparencyNotShownUnless")}</p>

        <div className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-card)]/60 p-3">
          <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyHumanDecisionTitle")}</p>
          <p className="mt-1">{t("dashboard.applicationTransparencyImportant")}</p>
        </div>

        <div className="rounded-lg border border-dashed border-[var(--twin-border)] px-3 py-2">
          <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyAutomationLabel")}</p>
          <p className="mt-1">{t("dashboard.applicationTransparencyAutomation")}</p>
        </div>
      </div>
    </details>
  );
}

export { showApplicationTransparency };
