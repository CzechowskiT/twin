"use client";

import { useTranslation } from "@/components/language-provider";

type Props = {
  company: string;
  /** applied | pending | interview — employer may see application-review data */
  status: string;
};

function showConsentReceipt(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "applied" || s === "pending" || s === "interview";
}

/** Lightweight consent receipt — static copy aligned with inbox PII policy (no DB). */
export function ApplicationConsentReceipt({ company, status }: Props) {
  const { t } = useTranslation();
  if (!showConsentReceipt(status)) return null;

  const employer = company.trim() || t("dashboard.consentReceiptEmployerFallback");

  return (
    <details className="mt-2 rounded border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/40 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium text-[var(--foreground)]">
        {t("dashboard.consentReceiptTitle")}
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed text-[var(--twin-muted-strong)]">
        <p>{t("dashboard.consentReceiptBody").replace("{company}", employer)}</p>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.consentReceiptVisibleLabel")}</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>{t("dashboard.consentReceiptVisibleName")}</li>
          <li>{t("dashboard.consentReceiptVisibleProfile")}</li>
          <li>{t("dashboard.consentReceiptVisibleMatch")}</li>
        </ul>
        <p className="font-medium text-[var(--foreground)]">{t("dashboard.consentReceiptHiddenLabel")}</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>{t("dashboard.consentReceiptHiddenEmail")}</li>
          <li>{t("dashboard.consentReceiptHiddenPhone")}</li>
          <li>{t("dashboard.consentReceiptHiddenCv")}</li>
        </ul>
        <p className="text-[var(--twin-muted)]">{t("dashboard.consentReceiptBasis")}</p>
        <p className="text-[var(--twin-muted)]">{t("dashboard.consentReceiptNotLegal")}</p>
      </div>
    </details>
  );
}

export { showConsentReceipt };
