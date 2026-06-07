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

/** Static panel — what TWIN shows recruiters in application_review (no DB). */
export function CandidateApplicationTransparencyPanel({ status }: Props) {
  const { t } = useTranslation();
  if (!showApplicationTransparency(status)) return null;

  return (
    <details className="mt-2 rounded border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/40 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium text-[var(--foreground)]">
        {t("dashboard.applicationTransparencyTitle")}
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed text-[var(--twin-muted-strong)]">
        <p>{t("dashboard.applicationTransparencyContext")}</p>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyWeShowLabel")}</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>{t("dashboard.applicationTransparencyWeShowName")}</li>
          <li>{t("dashboard.applicationTransparencyWeShowStatus")}</li>
          <li>{t("dashboard.applicationTransparencyWeShowMatch")}</li>
          <li>{t("dashboard.applicationTransparencyWeShowReviewCard")}</li>
          <li>{t("dashboard.applicationTransparencyWeShowRoleInfo")}</li>
        </ul>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyNotShownLabel")}</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>{t("dashboard.applicationTransparencyNotShownPhone")}</li>
          <li>{t("dashboard.applicationTransparencyNotShownEmail")}</li>
          <li>{t("dashboard.applicationTransparencyNotShownCv")}</li>
          <li>{t("dashboard.applicationTransparencyNotShownAddress")}</li>
          <li>{t("dashboard.applicationTransparencyNotShownSensitive")}</li>
        </ul>
        <p className="text-[var(--twin-muted)]">{t("dashboard.applicationTransparencyNotShownUnless")}</p>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyImportantLabel")}</p>
        <p>{t("dashboard.applicationTransparencyImportant")}</p>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.applicationTransparencyAutomationLabel")}</p>
        <p>{t("dashboard.applicationTransparencyAutomation")}</p>
      </div>
    </details>
  );
}

export { showApplicationTransparency };
