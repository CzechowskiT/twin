"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { CompanyRoleQualityChecklist } from "@/components/company/company-role-quality-checklist";
import {
  COMPANY_ROLE_STATUSES,
  COMPANY_WORK_MODES,
  type CompanyRole,
  type CompanyRoleStatus,
  type CompanyWorkMode,
  formatSkillsInput,
  parseSkillsInput,
} from "@/lib/company-jobs-roles";

type Props = {
  initial?: Partial<CompanyRole>;
  readOnly?: boolean;
  busy?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

function valuesFromRole(role?: Partial<CompanyRole>) {
  return {
    title: role?.title ?? "",
    status: (role?.status ?? "draft") as CompanyRoleStatus,
    location: role?.location ?? "",
    work_mode: (role?.work_mode ?? "") as CompanyWorkMode | "",
    requirements: role?.requirements ?? "",
    description: role?.description ?? "",
    must_have_skills: formatSkillsInput(role?.must_have_skills),
    nice_to_have_skills: formatSkillsInput(role?.nice_to_have_skills),
    salary_min: role?.salary_min != null ? String(role.salary_min) : "",
    salary_max: role?.salary_max != null ? String(role.salary_max) : "",
  };
}

export function CompanyRoleForm({ initial, readOnly = false, busy = false, onSubmit }: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => valuesFromRole(initial));

  const draftRole = useMemo<Partial<CompanyRole>>(
    () => ({
      title: values.title,
      status: values.status,
      location: values.location || null,
      work_mode: values.work_mode || null,
      requirements: values.requirements || null,
      description: values.description || null,
      must_have_skills: parseSkillsInput(values.must_have_skills),
      nice_to_have_skills: parseSkillsInput(values.nice_to_have_skills),
    }),
    [values],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) {
      toast.error(t("companyJobs.readOnlyBlocked"));
      return;
    }
    if (!values.title.trim()) {
      toast.error(t("companyJobs.titleRequired"));
      return;
    }
    const payload: Record<string, unknown> = {
      title: values.title.trim(),
      status: values.status,
      location: values.location.trim() || null,
      work_mode: values.work_mode || null,
      requirements: values.requirements.trim() || null,
      description: values.description.trim() || null,
      must_have_skills: parseSkillsInput(values.must_have_skills),
      nice_to_have_skills: parseSkillsInput(values.nice_to_have_skills),
    };
    if (values.salary_min.trim()) payload.salary_min = Number(values.salary_min);
    if (values.salary_max.trim()) payload.salary_max = Number(values.salary_max);
    await onSubmit(payload);
  }

  const disabled = readOnly || busy;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <div
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        data-company-roles-trust="internal-only"
      >
        <p className="font-medium">{t("companyJobs.trustTitle")}</p>
        <p className="mt-1 text-xs opacity-90">{t("companyJobs.trustBody")}</p>
      </div>

      {readOnly ? (
        <p
          className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-2 text-sm"
          data-company-roles-readonly="true"
        >
          {t("companyJobs.readOnlyUnavailable")}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldTitle")}</span>
            <input
              className="twin-input w-full border-2"
              value={values.title}
              disabled={disabled}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldStatus")}</span>
            <select
              className="twin-input w-full border-2"
              value={values.status}
              disabled={disabled}
              onChange={(e) =>
                setValues((v) => ({ ...v, status: e.target.value as CompanyRoleStatus }))
              }
            >
              {COMPANY_ROLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`companyJobs.status_${status}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("companyJobs.fieldLocation")}</span>
              <input
                className="twin-input w-full border-2"
                value={values.location}
                disabled={disabled}
                onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("companyJobs.fieldWorkMode")}</span>
              <select
                className="twin-input w-full border-2"
                value={values.work_mode}
                disabled={disabled}
                onChange={(e) =>
                  setValues((v) => ({ ...v, work_mode: e.target.value as CompanyWorkMode | "" }))
                }
              >
                <option value="">{t("companyJobs.workModeUnset")}</option>
                {COMPANY_WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`companyJobs.workMode_${mode}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldRequirements")}</span>
            <textarea
              className="twin-input min-h-[6rem] w-full border-2"
              value={values.requirements}
              disabled={disabled}
              onChange={(e) => setValues((v) => ({ ...v, requirements: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldDescription")}</span>
            <textarea
              className="twin-input min-h-[5rem] w-full border-2"
              value={values.description}
              disabled={disabled}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldMustHave")}</span>
            <textarea
              className="twin-input min-h-[4rem] w-full border-2 font-mono text-xs"
              placeholder={t("companyJobs.skillsPlaceholder")}
              value={values.must_have_skills}
              disabled={disabled}
              onChange={(e) => setValues((v) => ({ ...v, must_have_skills: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("companyJobs.fieldNiceToHave")}</span>
            <textarea
              className="twin-input min-h-[4rem] w-full border-2 font-mono text-xs"
              placeholder={t("companyJobs.skillsPlaceholder")}
              value={values.nice_to_have_skills}
              disabled={disabled}
              onChange={(e) =>
                setValues((v) => ({ ...v, nice_to_have_skills: e.target.value }))
              }
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("companyJobs.fieldSalaryMin")}</span>
              <input
                className="twin-input w-full border-2"
                inputMode="numeric"
                value={values.salary_min}
                disabled={disabled}
                onChange={(e) => setValues((v) => ({ ...v, salary_min: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("companyJobs.fieldSalaryMax")}</span>
              <input
                className="twin-input w-full border-2"
                inputMode="numeric"
                value={values.salary_max}
                disabled={disabled}
                onChange={(e) => setValues((v) => ({ ...v, salary_max: e.target.value }))}
              />
            </label>
          </div>

          <button
            type="submit"
            className="twin-btn-solid twin-touch-target"
            disabled={disabled}
            aria-disabled={disabled}
          >
            {busy ? t("common.loading") : t("companyJobs.saveRole")}
          </button>
        </div>

        <CompanyRoleQualityChecklist role={draftRole} />
      </div>
    </form>
  );
}
