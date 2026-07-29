"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { CandidateReadinessFlowBanner } from "@/components/candidate/candidate-readiness-flow-banner";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  CAREER_COMPASS_API_PATH,
  CURRENCY_OPTIONS,
  type CareerCompassData,
  SENIORITY_OPTIONS,
  WORK_MODE_OPTIONS,
  compassToForm,
  formToPayload,
  formsEqual,
  validateForm,
} from "@/lib/candidate-career-compass";
import { CareerCopilotPanel } from "@/components/career/career-copilot-panel";
import { DailyCareerOsPanel } from "@/components/career/daily-career-os-panel";
import { CAREER_COMPASS_SHIP_STATUS } from "@/lib/seven-day-d2-candidate";
import type { TranslationKey } from "@/lib/i18n";

const VALIDATION_KEYS: Record<string, TranslationKey> = {
  salary_min_gt_max: "dashboard.careerCompassValidationSalaryMinGtMax",
  seniority_required_with_role: "dashboard.careerCompassValidationSeniorityRequired",
};

const SENIORITY_LABEL_KEYS: Record<string, TranslationKey> = {
  junior: "dashboard.careerCompassSeniorityJunior",
  mid: "dashboard.careerCompassSeniorityMid",
  senior: "dashboard.careerCompassSenioritySenior",
  lead: "dashboard.careerCompassSeniorityLead",
  director: "dashboard.careerCompassSeniorityDirector",
  executive: "dashboard.careerCompassSeniorityExecutive",
};

const WORK_MODE_LABEL_KEYS: Record<string, TranslationKey> = {
  remote: "dashboard.careerCompassWorkModeRemote",
  hybrid: "dashboard.careerCompassWorkModeHybrid",
  onsite: "dashboard.careerCompassWorkModeOnsite",
  flexible: "dashboard.careerCompassWorkModeFlexible",
};

type FormState = ReturnType<typeof compassToForm>;

const EMPTY_FORM: FormState = compassToForm({
  configured: false,
  target_role: null,
  target_seniority: null,
  preferred_industries: [],
  preferred_locations: [],
  work_mode: null,
  salary_expectation_min: null,
  salary_expectation_max: null,
  salary_currency: "PLN",
  career_priorities: [],
  skill_gaps: [],
  strengths: [],
  next_steps: [],
  learning_actions: [],
  notes: null,
  completion_status: "draft",
  completion_percent: 0,
  missing_fields: [],
  readiness_complete: false,
  updated_at: null,
});

function FieldSkeleton() {
  return <div className="h-10 animate-pulse rounded-md bg-[var(--twin-border)]/60" />;
}

export default function CareerCompassPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const loadOnce = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CareerCompassData | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(EMPTY_FORM);

  const dirty = useMemo(() => !formsEqual(form, savedForm), [form, savedForm]);
  const validationError = useMemo(() => validateForm(form), [form]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return null;
    const d = await apiFetch<CareerCompassData>(CAREER_COMPASS_API_PATH, {}, token);
    setData(d);
    const nextForm = compassToForm(d);
    setForm(nextForm);
    setSavedForm(nextForm);
    return d;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (loadOnce.current) return;
    loadOnce.current = true;
    queueMicrotask(() => {
      void load()
        .catch((e) => setError(e instanceof Error ? e.message : t("dashboard.identityError")))
        .finally(() => setLoading(false));
    });
  }, [router, load, t]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (validationError) {
      setError(t(VALIDATION_KEYS[validationError] ?? "dashboard.careerCompassSaveError"));
      return;
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const d = await apiFetch<CareerCompassData>(
        CAREER_COMPASS_API_PATH,
        { method: "PUT", body: JSON.stringify(formToPayload(form)) },
        token,
      );
      setData(d);
      const nextForm = compassToForm(d);
      setForm(nextForm);
      setSavedForm(nextForm);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.careerCompassSaveError"));
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaveSuccess(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <Shell wide rail>
        <div className="space-y-4" data-career-compass-loading>
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </Shell>
    );
  }

  const completion = data?.completion_percent ?? 0;
  const isEmpty = !data?.configured;

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="twin-section-title text-xl sm:text-2xl">{t("dashboard.careerCompassPageTitle")}</h1>
          <WorkspaceStatusBadge status={CAREER_COMPASS_SHIP_STATUS} />
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("dashboard.careerCompassPageTitle")} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard" className="twin-link">
          {t("profile.backToDashboard")}
        </Link>
        <Link href="/profile" className="twin-link">
          {t("nav.profile")}
        </Link>
      </div>

      <CandidateReadinessFlowBanner context="career_brief" />

      <Card variant="soft" className="mb-6" data-career-compass-completion>
        <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassPageLead")}</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-medium text-[var(--foreground)]">
            <span>{t("dashboard.careerCompassCompletionLabel").replace("{percent}", String(completion))}</span>
            {data?.readiness_complete ? (
              <span className="text-emerald-600">{t("dashboard.careerCompassReadinessComplete")}</span>
            ) : (
              <span className="text-[var(--twin-muted)]">{t("dashboard.careerCompassReadinessIncomplete")}</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--twin-border)]">
            <div
              className="h-full rounded-full bg-[var(--twin-accent)] transition-all"
              style={{ width: `${Math.min(100, completion)}%` }}
            />
          </div>
        </div>
      </Card>

      <DailyCareerOsPanel />
      <CareerCopilotPanel />

      {error ? (
        <Card variant="soft" className="mb-4 border-red-200 bg-red-50/50">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            className="twin-link mt-2 text-sm font-semibold"
            onClick={() => {
              setError(null);
              setLoading(true);
              void load()
                .catch((e) => setError(e instanceof Error ? e.message : t("dashboard.identityError")))
                .finally(() => setLoading(false));
            }}
          >
            {t("dashboard.careerCompassRetry")}
          </button>
        </Card>
      ) : null}

      {saveSuccess ? (
        <p className="mb-4 text-sm text-emerald-600" data-career-compass-save-success>
          {t("dashboard.careerCompassSaveSuccess")}
        </p>
      ) : null}

      {isEmpty ? (
        <Card variant="soft" className="mb-6" data-career-compass-empty>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassEmptyLead")}</p>
        </Card>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6" data-career-compass-form>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionTarget")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t("dashboard.careerCompassTargetRole")}</Label>
              <Input
                value={form.targetRole}
                onChange={(e) => updateField("targetRole", e.target.value)}
                placeholder={t("dashboard.careerCompassTargetRolePlaceholder")}
                required
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassTargetSeniority")}</Label>
              <select
                className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
                value={form.targetSeniority}
                onChange={(e) => updateField("targetSeniority", e.target.value)}
                required
              >
                <option value="">{t("dashboard.careerCompassSelectPlaceholder")}</option>
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(SENIORITY_LABEL_KEYS[opt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("dashboard.careerCompassWorkMode")}</Label>
              <select
                className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
                value={form.workMode}
                onChange={(e) => updateField("workMode", e.target.value)}
              >
                <option value="">{t("dashboard.careerCompassSelectPlaceholder")}</option>
                {WORK_MODE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(WORK_MODE_LABEL_KEYS[opt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("dashboard.careerCompassIndustries")}</Label>
              <Input
                value={form.preferredIndustries}
                onChange={(e) => updateField("preferredIndustries", e.target.value)}
                placeholder={t("dashboard.careerCompassIndustriesPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassLocation")}</Label>
              <Input
                value={form.preferredLocations}
                onChange={(e) => updateField("preferredLocations", e.target.value)}
                placeholder={t("dashboard.careerCompassLocationPlaceholder")}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionCompensation")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{t("dashboard.careerCompassSalaryMin")}</Label>
              <Input
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => updateField("salaryMin", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassSalaryMax")}</Label>
              <Input
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) => updateField("salaryMax", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassSalaryCurrency")}</Label>
              <select
                className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
                value={form.salaryCurrency}
                onChange={(e) => updateField("salaryCurrency", e.target.value as FormState["salaryCurrency"])}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionPriorities")}</h2>
          <Label>{t("dashboard.careerCompassPriorities")}</Label>
          <Input
            value={form.careerPriorities}
            onChange={(e) => updateField("careerPriorities", e.target.value)}
            placeholder={t("dashboard.careerCompassPrioritiesPlaceholder")}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionStrengthsGaps")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("dashboard.careerCompassStrengths")}</Label>
              <Input
                value={form.strengths}
                onChange={(e) => updateField("strengths", e.target.value)}
                placeholder={t("dashboard.careerCompassStrengthsPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassSkillGaps")}</Label>
              <Input
                value={form.skillGaps}
                onChange={(e) => updateField("skillGaps", e.target.value)}
                placeholder={t("dashboard.careerCompassSkillGapsPlaceholder")}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionNextActions")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("dashboard.careerCompassNextSteps")}</Label>
              <Input
                value={form.nextSteps}
                onChange={(e) => updateField("nextSteps", e.target.value)}
                placeholder={t("dashboard.careerCompassNextStepsPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("dashboard.careerCompassLearningActions")}</Label>
              <Input
                value={form.learningActions}
                onChange={(e) => updateField("learningActions", e.target.value)}
                placeholder={t("dashboard.careerCompassLearningActionsPlaceholder")}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("dashboard.careerCompassSectionNotes")}</h2>
          <textarea
            className="min-h-[100px] w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder={t("dashboard.careerCompassNotesPlaceholder")}
          />
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || !dirty || Boolean(validationError)}>
            {saving ? t("dashboard.careerCompassSaving") : t("dashboard.careerCompassSave")}
          </Button>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target !w-auto px-4 py-2 text-sm"
            disabled={saving}
            onClick={() => {
              setLoading(true);
              void load()
                .catch((e) => setError(e instanceof Error ? e.message : t("dashboard.identityError")))
                .finally(() => setLoading(false));
            }}
          >
            {t("dashboard.careerCompassReload")}
          </button>
        </div>
      </form>
    </Shell>
  );
}
