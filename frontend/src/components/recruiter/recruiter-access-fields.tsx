"use client";

import type { RecruiterCompanyOption } from "@/lib/recruiter-inbox";
import { useTranslation } from "@/components/language-provider";

type RecruiterAccessFieldsProps = {
  token: string;
  onTokenChange: (value: string) => void;
  companySlug: string;
  onCompanySlugChange: (value: string) => void;
  companyOptions: RecruiterCompanyOption[];
  allowCustomCompany?: boolean;
  idPrefix?: string;
};

/** Labeled access code + company picker for recruiter pilot surfaces. */
export function RecruiterAccessFields({
  token,
  onTokenChange,
  companySlug,
  onCompanySlugChange,
  companyOptions,
  allowCustomCompany = true,
  idPrefix = "recruiter",
}: RecruiterAccessFieldsProps) {
  const { t } = useTranslation();
  const accessId = `${idPrefix}-access-code`;
  const companyId = `${idPrefix}-company`;
  const knownSlugs = new Set(companyOptions.map((o) => o.slug));
  const selectValue = knownSlugs.has(companySlug) ? companySlug : allowCustomCompany ? "__custom__" : companySlug;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="twin-form-label block" htmlFor={accessId}>
        <span className="font-medium text-[var(--foreground)]">{t("recruiterInbox.accessCodeLabel")}</span>
        <span className="twin-form-label__caption twin-muted mt-1 block text-xs leading-relaxed">
          {t("recruiterInbox.accessCodeHint")}
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
      <div className="twin-form-label block">
        <label className="font-medium text-[var(--foreground)]" htmlFor={companyId}>
          {t("recruiterInbox.companyLabel")}
        </label>
        <span className="twin-form-label__caption twin-muted mt-1 block text-xs leading-relaxed">
          {t("recruiterInbox.companyHint")}
        </span>
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
            {allowCustomCompany ? (
              <option value="__custom__">{t("recruiterInbox.companyOptionOther")}</option>
            ) : null}
          </select>
        ) : null}
        {(allowCustomCompany && (companyOptions.length === 0 || selectValue === "__custom__")) ||
        (!allowCustomCompany && companyOptions.length === 0) ? (
          <input
            id={companyOptions.length === 0 ? companyId : `${companyId}-custom`}
            className="twin-input mt-2 w-full border-2"
            placeholder={t("recruiterInbox.companyPlaceholder")}
            value={selectValue === "__custom__" || !knownSlugs.has(companySlug) ? companySlug : ""}
            onChange={(e) => onCompanySlugChange(e.target.value)}
          />
        ) : null}
      </div>
    </div>
  );
}
