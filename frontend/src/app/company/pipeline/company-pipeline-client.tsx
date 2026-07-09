"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { getClientApiLocale } from "@/lib/api-locale";
import { isLikelyBrowserNetworkFailureMessage } from "@/lib/api";
import {
  COMPANY_PIPELINE_SEGMENT_KEYS,
  type CompanyPipelineQualityPayload,
  type CompanyPipelineSegments,
} from "@/lib/company-pipeline-quality";
import {
  RECRUITER_DEMO_COMPANY_SLUG,
  companySlugToLabel,
  mergeCompanyOptions,
  parseRecruiterInviteSearchParams,
  readRecruiterInboxDemoEnv,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import {
  parseRecruiterInboxErrorDetail,
  recruiterInboxErrorMessageKey,
  type RecruiterInboxErrorMessageKey,
} from "@/lib/recruiter-inbox-errors";
import { COLLAPSE_COMPANY_DEMO_JOURNEYS, COMPANY_PIPELINE_SHIP_STATUS } from "@/lib/seven-day-d4-company";

const SEGMENT_LABEL_KEYS: Record<keyof CompanyPipelineSegments, TranslationKey> = {
  in_review: "companyPipeline.metricInReview",
  accepted: "companyPipeline.metricAccepted",
  invited: "companyPipeline.metricInvited",
  rejected: "companyPipeline.metricRejected",
  on_hold: "companyPipeline.metricOnHold",
};

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      {hint ? <p className="twin-muted mt-2 text-xs leading-relaxed">{hint}</p> : null}
    </Card>
  );
}

export default function CompanyPipelineClient() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const invite = useMemo(() => parseRecruiterInviteSearchParams(searchParams), [searchParams]);
  const demoEnv = readRecruiterInboxDemoEnv();
  const session = readRecruiterInboxSession();

  const [token, setToken] = useState(invite.token || session.token || demoEnv.token);
  const [companyRaw, setCompanyRaw] = useState(
    invite.companySlug || session.companySlug || demoEnv.companySlug,
  );
  const [companySlug, setCompanySlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [errorKey, setErrorKey] = useState<RecruiterInboxErrorMessageKey | "loadFailed" | null>(null);
  const [metrics, setMetrics] = useState<CompanyPipelineQualityPayload | null>(null);

  const companyOptions = useMemo(() => mergeCompanyOptions(companyRaw), [companyRaw]);
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  const loadMetrics = useCallback(async () => {
    const slug = resolveCompanySlugFromRaw(companyRaw, knownSlugs);
    if (!token.trim() || !slug) {
      setAuthError(true);
      setErrorKey(null);
      setMetrics(null);
      return;
    }
    setAuthError(false);
    setCompanySlug(slug);
    writeRecruiterInboxSession(token, slug);
    setLoading(true);
    setErrorKey(null);
    try {
      const q = recruiterInboxQuery(token.trim(), slug);
      const res = await fetch(`/api/company/pipeline?${q}`, {
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = parseRecruiterInboxErrorDetail(await res.text());
        setErrorKey(recruiterInboxErrorMessageKey(detail, res.status));
        setMetrics(null);
        return;
      }
      setMetrics((await res.json()) as CompanyPipelineQualityPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorKey(isLikelyBrowserNetworkFailureMessage(msg) ? "errorNetwork" : "loadFailed");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [companyRaw, knownSlugs, token]);

  useEffect(() => {
    if (!invite.token && !invite.companySlug) return;
    queueMicrotask(() => {
      void loadMetrics();
    });
  }, [invite.companySlug, invite.token, loadMetrics]);

  const companyLabel = companySlugToLabel(companySlug || companyRaw);

  return (
    <Shell wide data-wave2b-company-pipeline-green={COMPANY_PIPELINE_SHIP_STATUS}>
      <header className="mb-8 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("companyPipeline.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("companyPipeline.title")}</h1>
        </div>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("companyPipeline.lead")}</p>
        <p className="max-w-2xl rounded-md border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/50 px-3 py-2 text-xs text-[var(--twin-muted-strong)]">
          {t("companyPipeline.humanDecisionNote")}
        </p>
      </header>

      <Card variant="soft" className="mb-8 border-[var(--twin-border)]/80 p-5 sm:p-6">
        <RecruiterAccessFields
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
          idPrefix="company-pipeline"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="twin-btn-solid twin-touch-target" disabled={loading} onClick={() => void loadMetrics()}>
            {loading ? t("common.loadingEllipsis") : t("companyPipeline.load")}
          </button>
          <button
            type="button"
            className="twin-btn-ghost twin-touch-target text-sm"
            onClick={() => {
              setCompanyRaw(RECRUITER_DEMO_COMPANY_SLUG);
              void loadMetrics();
            }}
          >
            {t("recruiterInbox.demoCompanyCta")}
          </button>
        </div>
        {authError ? (
          <p className="mt-4 text-sm text-[var(--twin-danger)]" role="alert">
            {t("recruiterInbox.missingAuth")}
          </p>
        ) : null}
        {errorKey ? (
          <p className="mt-4 text-sm text-[var(--twin-danger)]" role="alert">
            {t(errorKey === "loadFailed" ? "companyPipeline.loadFailed" : (`recruiterInbox.${errorKey}` as TranslationKey))}
          </p>
        ) : null}
      </Card>

      {loading ? <p className="twin-muted text-sm">{t("companyPipeline.loading")}</p> : null}

      {!loading && metrics ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("companyPipeline.workspaceTitle").replace("{company}", companyLabel)}</h2>
            <p className="twin-muted text-xs">
              {t("companyPipeline.updated")} {new Date(metrics.generated_at).toLocaleString(loc)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COMPANY_PIPELINE_SEGMENT_KEYS.map((key) => (
              <MetricCard key={key} label={t(SEGMENT_LABEL_KEYS[key])} value={fmt(metrics.company_totals[key])} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t("companyPipeline.metricAvgMatch")}
              value={metrics.average_match_score != null ? `${metrics.average_match_score}%` : t("companyPipeline.metricUnavailable")}
            />
            <MetricCard label={t("companyPipeline.metricMissingData")} value={fmt(metrics.missing_data_count)} hint={t("companyPipeline.metricMissingDataHint")} />
            <MetricCard label={t("companyPipeline.metricVerificationRisk")} value={fmt(metrics.verification_risk_count)} hint={t("companyPipeline.metricVerificationRiskHint")} />
            <MetricCard label={t("companyPipeline.metricTotalApplications")} value={fmt(metrics.total_applications)} />
          </div>

          {metrics.recruiter_activity ? (
            <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
              <h3 className="text-sm font-semibold">{t("companyPipeline.activityTitle")}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetricCard label={t("companyPipeline.activityEvents")} value={fmt(metrics.recruiter_activity.events_last_7_days)} />
                <MetricCard label={t("companyPipeline.activityDecisions")} value={fmt(metrics.recruiter_activity.decisions_last_7_days)} />
              </div>
            </Card>
          ) : (
            <p className="twin-muted text-xs">{t("companyPipeline.activityUnavailable")}</p>
          )}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">{t("companyPipeline.rolesTitle")}</h3>
            <p className="twin-muted text-xs">{t("companyPipeline.rolesLead")}</p>
            {metrics.roles.length === 0 ? (
              <p className="twin-muted text-sm">{t("companyPipeline.rolesEmpty")}</p>
            ) : (
              metrics.roles.map((role) => (
                <Card key={`${role.job_id}-${role.role_title}`} variant="soft" className="border-[var(--twin-border)]/80 p-5">
                  <div className="mb-3 flex justify-between gap-2">
                    <h4 className="font-semibold">{role.role_title}</h4>
                    <span className="text-xs tabular-nums">{t("companyPipeline.roleTotal").replace("{count}", fmt(role.total))}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {COMPANY_PIPELINE_SEGMENT_KEYS.map((key) => (
                      <div key={key} className="rounded border border-[var(--twin-border)]/60 px-2 py-1 text-xs">
                        <p className="text-[10px] uppercase text-[var(--twin-muted)]">{t(SEGMENT_LABEL_KEYS[key])}</p>
                        <p className="text-lg font-semibold tabular-nums">{fmt(role.segments[key])}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </section>

          <p className="twin-muted max-w-3xl text-xs">{t("companyPipeline.scopeNote")}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/recruiter/inbox" className="twin-link font-medium">{t("companyPipeline.linkInbox")}</Link>
            <Link href="/company/talent-pool" className="twin-link font-medium">{t("companyPipeline.linkTalentPool")}</Link>
            <Link href="/recruiter/jobs" className="twin-link font-medium">{t("companyPipeline.linkRecruiterJobs")}</Link>
            <Link href="/for-companies" className="twin-link font-medium">{t("companyPipeline.linkCompanies")}</Link>
          </div>
        </div>
      ) : null}

      {!loading && !metrics && !errorKey && !authError ? (
        <GuidedEmptyState
          title={t("companyPipeline.emptyTitle")}
          message={t("companyPipeline.emptyBody")}
          steps={[t("companyPipeline.emptyStep1"), t("companyPipeline.emptyStep2"), t("companyPipeline.emptyStep3")]}
          actionLabel={t("companyPipeline.load")}
          onAction={() => void loadMetrics()}
        />
      ) : null}
    </Shell>
  );
}
