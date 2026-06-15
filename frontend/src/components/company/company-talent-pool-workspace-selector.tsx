"use client";

import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { COMPANY_TALENT_POOL_MARKERS } from "@/lib/company-talent-pool";
import type { RecruiterCompanyOption } from "@/lib/recruiter-inbox";

type CompanyTalentPoolWorkspaceSelectorProps = {
  token: string;
  onTokenChange: (value: string) => void;
  companySlug: string;
  onCompanySlugChange: (value: string) => void;
  companyOptions: RecruiterCompanyOption[];
  loading: boolean;
  authError: boolean;
  onLoad: () => void;
  onDemoCompany: () => void;
};

/** Premium collapsible workspace gate — pilot preview only, no technical jargon. */
export function CompanyTalentPoolWorkspaceSelector({
  token,
  onTokenChange,
  companySlug,
  onCompanySlugChange,
  companyOptions,
  loading,
  authError,
  onLoad,
  onDemoCompany,
}: CompanyTalentPoolWorkspaceSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const knownSlugs = new Set(companyOptions.map((o) => o.slug));
  const selectValue = knownSlugs.has(companySlug) ? companySlug : "__custom__";
  const accessId = "company-talent-pool-pilot-code";
  const companyId = "company-talent-pool-company";

  return (
    <Card
      variant="soft"
      className="mb-8 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-0"
      data-testid={COMPANY_TALENT_POOL_MARKERS.workspaceSelector}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-accent)]">
            {t("companyTalentPool.workspaceSelectorEyebrow")}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {t("companyTalentPool.previewSettingsToggle")}
          </p>
        </div>
        <span className="twin-muted text-xs" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[var(--twin-border)]/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="twin-muted mb-4 text-xs leading-relaxed">{t("companyTalentPool.workspaceSelectorLead")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="twin-form-label block" htmlFor={companyId}>
              <span className="font-medium text-[var(--foreground)]">{t("companyTalentPool.workspaceCompanyLabel")}</span>
              {companyOptions.length > 0 ? (
                <select
                  id={companyId}
                  className="twin-input mt-2 w-full border-2"
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") {
                      onCompanySlugChange(knownSlugs.has(companySlug) ? "" : companySlug);
                      return;
                    }
                    onCompanySlugChange(v);
                  }}
                >
                  <option value="">{t("recruiterInbox.companyPlaceholder")}</option>
                  {companyOptions.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.label}
                    </option>
                  ))}
                  <option value="__custom__">{t("recruiterInbox.companyOptionOther")}</option>
                </select>
              ) : (
                <input
                  id={companyId}
                  className="twin-input mt-2 w-full border-2"
                  placeholder={t("recruiterInbox.companyPlaceholder")}
                  value={companySlug}
                  onChange={(e) => onCompanySlugChange(e.target.value)}
                />
              )}
              {companyOptions.length > 0 && selectValue === "__custom__" ? (
                <input
                  id={`${companyId}-custom`}
                  className="twin-input mt-2 w-full border-2"
                  placeholder={t("recruiterInbox.companyPlaceholder")}
                  value={!knownSlugs.has(companySlug) ? companySlug : ""}
                  onChange={(e) => onCompanySlugChange(e.target.value)}
                />
              ) : null}
            </label>
            <label className="twin-form-label block" htmlFor={accessId}>
              <span className="font-medium text-[var(--foreground)]">{t("companyTalentPool.workspacePilotCodeLabel")}</span>
              <span className="twin-form-label__caption twin-muted mt-1 block text-xs leading-relaxed">
                {t("companyTalentPool.workspacePilotCodeHint")}
              </span>
              <input
                id={accessId}
                className="twin-input mt-2 w-full border-2"
                type="password"
                autoComplete="off"
                placeholder={t("recruiterInbox.accessCodePlaceholder")}
                value={token}
                onChange={(e) => onTokenChange(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="twin-btn-solid twin-touch-target" disabled={loading} onClick={onLoad}>
              {loading ? t("common.loadingEllipsis") : t("companyTalentPool.workspaceLoadCta")}
            </button>
            <button type="button" className="twin-btn-ghost twin-touch-target text-sm" onClick={onDemoCompany}>
              {t("recruiterInbox.demoCompanyCta")}
            </button>
          </div>
          {authError ? (
            <p className="mt-4 text-sm text-[var(--twin-danger)]" role="alert">
              {t("recruiterInbox.missingAuth")}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
