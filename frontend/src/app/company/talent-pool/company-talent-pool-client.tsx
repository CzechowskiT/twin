"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { getClientApiLocale } from "@/lib/api-locale";
import { isLikelyBrowserNetworkFailureMessage } from "@/lib/api";
import {
  COMPANY_TALENT_POOL_MARKERS,
  COMPANY_TALENT_POOL_ROUTE,
  type CompanyTalentPoolPayload,
} from "@/lib/company-talent-pool";
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

const EXEC_SUMMARY_KEYS = [
  "knownCandidates",
  "importedCandidates",
  "radarReady",
  "dataGaps",
  "potentialDuplicates",
  "activeSources",
] as const;

const EXEC_SUMMARY_LABEL_KEYS: Record<(typeof EXEC_SUMMARY_KEYS)[number], TranslationKey> = {
  knownCandidates: "companyTalentPool.summaryKnownCandidates",
  importedCandidates: "companyTalentPool.summaryImportedCandidates",
  radarReady: "companyTalentPool.summaryRadarReady",
  dataGaps: "companyTalentPool.summaryDataGaps",
  potentialDuplicates: "companyTalentPool.summaryPotentialDuplicates",
  activeSources: "companyTalentPool.summaryActiveSources",
};

const QUALITY_DIM_KEYS = [
  "missingRoleTitle",
  "missingSkills",
  "missingConsent",
  "staleRecords",
  "duplicates",
] as const;

const QUALITY_DIM_LABEL_KEYS: Record<(typeof QUALITY_DIM_KEYS)[number], TranslationKey> = {
  missingRoleTitle: "companyTalentPool.qualityMissingRoleTitle",
  missingSkills: "companyTalentPool.qualityMissingSkills",
  missingConsent: "companyTalentPool.qualityMissingConsent",
  staleRecords: "companyTalentPool.qualityStaleRecords",
  duplicates: "companyTalentPool.qualityDuplicates",
};

const SOURCE_KEYS = [
  "applications",
  "inbox",
  "scorecards",
  "notes",
  "importPool",
  "atsConnectors",
] as const;

const SOURCE_LABEL_KEYS: Record<(typeof SOURCE_KEYS)[number], TranslationKey> = {
  applications: "companyTalentPool.sourceApplications",
  inbox: "companyTalentPool.sourceInbox",
  scorecards: "companyTalentPool.sourceScorecards",
  notes: "companyTalentPool.sourceNotes",
  importPool: "companyTalentPool.sourceImportPool",
  atsConnectors: "companyTalentPool.sourceAtsConnectors",
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

function executiveValue(
  payload: CompanyTalentPoolPayload,
  key: (typeof EXEC_SUMMARY_KEYS)[number],
): number {
  const s = payload.executive_summary;
  const map = {
    knownCandidates: s.known_candidates,
    importedCandidates: s.imported_candidates,
    radarReady: s.radar_ready,
    dataGaps: s.data_gaps,
    potentialDuplicates: s.potential_duplicates,
    activeSources: s.active_sources,
  };
  return map[key];
}

function dimensionValue(
  payload: CompanyTalentPoolPayload,
  key: (typeof QUALITY_DIM_KEYS)[number],
): number {
  const d = payload.data_quality.dimensions;
  const map = {
    missingRoleTitle: d.missing_role_title ?? 0,
    missingSkills: d.missing_skills ?? 0,
    missingConsent: d.missing_consent ?? 0,
    staleRecords: d.stale_records ?? 0,
    duplicates: d.duplicates ?? 0,
  };
  return map[key];
}

function sourceValue(
  payload: CompanyTalentPoolPayload,
  key: (typeof SOURCE_KEYS)[number],
  plannedLabel: string,
): string {
  const c = payload.source_coverage;
  const map: Record<(typeof SOURCE_KEYS)[number], string> = {
    applications: String(c.applications),
    inbox: String(c.inbox),
    scorecards: String(c.scorecards),
    notes: String(c.notes),
    importPool: String(c.import_pool),
    atsConnectors: c.ats_connectors_planned ? plannedLabel : "0",
  };
  return map[key];
}

export default function CompanyTalentPoolClient() {
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
  const [payload, setPayload] = useState<CompanyTalentPoolPayload | null>(null);

  const companyOptions = useMemo(() => mergeCompanyOptions(companyRaw), [companyRaw]);
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  const loadPool = useCallback(async () => {
    const slug = resolveCompanySlugFromRaw(companyRaw, knownSlugs);
    if (!token.trim() || !slug) {
      setAuthError(true);
      setErrorKey(null);
      setPayload(null);
      return;
    }
    setAuthError(false);
    setCompanySlug(slug);
    writeRecruiterInboxSession(token, slug);
    setLoading(true);
    setErrorKey(null);
    try {
      const q = recruiterInboxQuery(token.trim(), slug);
      const res = await fetch(`/api/company/talent-pool?${q}`, {
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = parseRecruiterInboxErrorDetail(await res.text());
        setErrorKey(recruiterInboxErrorMessageKey(detail, res.status));
        setPayload(null);
        return;
      }
      setPayload((await res.json()) as CompanyTalentPoolPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorKey(isLikelyBrowserNetworkFailureMessage(msg) ? "errorNetwork" : "loadFailed");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [companyRaw, knownSlugs, token]);

  useEffect(() => {
    if (!invite.token && !invite.companySlug) return;
    queueMicrotask(() => {
      void loadPool();
    });
  }, [invite.companySlug, invite.token, loadPool]);

  const companyLabel = companySlugToLabel(companySlug || companyRaw);
  const hasRecords = (payload?.items.length ?? 0) > 0;

  return (
    <Shell wide data-testid={COMPANY_TALENT_POOL_MARKERS.page}>
      <CompanyWorkspaceNav />
      <header className="mb-8 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("companyTalentPool.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("companyTalentPool.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("companyTalentPool.lead")}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5">
            {t("companyTalentPool.chipPilot")}
          </span>
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5">
            {t("companyTalentPool.chipInternalFirst")}
          </span>
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5">
            {t("companyTalentPool.chipNoOutreach")}
          </span>
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5">
            {t("companyTalentPool.chipRecruiterReview")}
          </span>
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5">
            {t("companyTalentPool.chipAtsPlanned")}
          </span>
        </div>
      </header>

      <Card variant="soft" className="mb-8 border-[var(--twin-border)]/80 p-5 sm:p-6">
        <RecruiterAccessFields
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
          idPrefix="company-talent-pool"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="twin-btn-solid twin-touch-target" disabled={loading} onClick={() => void loadPool()}>
            {loading ? t("common.loadingEllipsis") : t("companyTalentPool.load")}
          </button>
          <button
            type="button"
            className="twin-btn-ghost twin-touch-target text-sm"
            onClick={() => {
              setCompanyRaw(RECRUITER_DEMO_COMPANY_SLUG);
              void loadPool();
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
            {t(errorKey === "loadFailed" ? "companyTalentPool.loadFailed" : (`recruiterInbox.${errorKey}` as TranslationKey))}
          </p>
        ) : null}
      </Card>

      {loading ? <p className="twin-muted text-sm">{t("companyTalentPool.loading")}</p> : null}

      {!loading && payload ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {t("companyTalentPool.workspaceTitle").replace("{company}", companyLabel)}
            </h2>
            <p className="twin-muted text-xs">
              {t("companyTalentPool.updated")} {new Date(payload.generated_at).toLocaleString(loc)}
            </p>
          </div>

          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid={COMPANY_TALENT_POOL_MARKERS.summaryPanel}
          >
            {EXEC_SUMMARY_KEYS.map((key) => (
              <MetricCard
                key={key}
                label={t(EXEC_SUMMARY_LABEL_KEYS[key])}
                value={fmt(executiveValue(payload, key))}
                hint={
                  key === "activeSources"
                    ? t("companyTalentPool.summaryActiveSourcesHint").replace(
                        "{planned}",
                        fmt(payload.executive_summary.planned_sources),
                      )
                    : undefined
                }
              />
            ))}
          </div>

          <Card
            variant="soft"
            className="border-[var(--twin-border)]/80 p-5"
            data-testid={COMPANY_TALENT_POOL_MARKERS.qualityPanel}
          >
            <h3 className="text-sm font-semibold">{t("companyTalentPool.dataQualityTitle")}</h3>
            <p className="twin-muted mt-1 text-xs">{t("companyTalentPool.dataQualityBody")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {QUALITY_DIM_KEYS.map((key) => (
                <MetricCard
                  key={key}
                  label={t(QUALITY_DIM_LABEL_KEYS[key])}
                  value={fmt(dimensionValue(payload, key))}
                />
              ))}
            </div>
            {payload.data_quality.top_warnings.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm">
                {payload.data_quality.top_warnings.map((w) => (
                  <li key={w.code} className="flex justify-between border-b border-[var(--twin-border)]/40 py-1">
                    <span>{w.code}</span>
                    <span className="twin-muted tabular-nums">{w.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="twin-muted mt-4 text-sm">{t("companyTalentPool.noQualityWarnings")}</p>
            )}
          </Card>

          <Card
            variant="soft"
            className="border-[var(--twin-border)]/80 p-5"
            data-testid={COMPANY_TALENT_POOL_MARKERS.sourceCoverage}
          >
            <h3 className="text-sm font-semibold">{t("companyTalentPool.sourceCoverageTitle")}</h3>
            <p className="twin-muted mt-1 text-xs">{payload.scope_note}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {SOURCE_KEYS.map((key) => (
                <li key={key} className="flex justify-between gap-2 border-b border-[var(--twin-border)]/40 py-1">
                  <span>{t(SOURCE_LABEL_KEYS[key])}</span>
                  <span className="twin-muted tabular-nums">{sourceValue(payload, key, t("companyTalentPool.plannedLabel"))}</span>
                </li>
              ))}
            </ul>
          </Card>

          {hasRecords ? (
            <Card
              variant="soft"
              className="border-[var(--twin-border)]/80 p-5"
              data-testid={COMPANY_TALENT_POOL_MARKERS.recordsList}
            >
              <h3 className="mb-3 text-sm font-semibold">{t("companyTalentPool.recordsTitle")}</h3>
              <p className="twin-muted mb-4 text-xs">{t("companyTalentPool.recordsSafeNote")}</p>
              <ul className="divide-y divide-[var(--twin-border)]/60">
                {payload.items.map((rec) => (
                  <li key={rec.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{rec.display_name}</p>
                        <p className="twin-muted text-xs">{rec.job_title || t("companyTalentPool.noJobTitle")}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs">
                        {t("companyTalentPool.chipInternal")}
                      </span>
                    </div>
                    {rec.skills && rec.skills.length > 0 ? (
                      <p className="twin-muted mt-1 text-xs">{rec.skills.slice(0, 5).join(" · ")}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <div data-testid={COMPANY_TALENT_POOL_MARKERS.emptyState}>
              <GuidedEmptyState
                title={t("companyTalentPool.emptyTitle")}
                message={t("companyTalentPool.emptyBody")}
                steps={[
                  t("companyTalentPool.emptyStep1"),
                  t("companyTalentPool.emptyStep2"),
                  t("companyTalentPool.emptyStep3"),
                ]}
                actionHref={payload.links.recruiter_import}
                actionLabel={t("companyTalentPool.emptyCta")}
              />
            </div>
          )}

          <p className="twin-muted max-w-3xl text-xs">{t("companyTalentPool.trustCopy")}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href={payload.links.recruiter_import}
              className="twin-link font-medium"
              data-testid={COMPANY_TALENT_POOL_MARKERS.importLink}
            >
              {t("companyTalentPool.linkImport")}
            </Link>
            <Link
              href={payload.links.integrations}
              className="twin-link font-medium"
              data-testid={COMPANY_TALENT_POOL_MARKERS.integrationsLink}
            >
              {t("companyTalentPool.linkIntegrations")}
            </Link>
            <Link
              href={payload.links.pipeline}
              className="twin-link font-medium"
              data-testid={COMPANY_TALENT_POOL_MARKERS.pipelineLink}
            >
              {t("companyTalentPool.linkPipeline")}
            </Link>
            <Link href={COMPANY_TALENT_POOL_ROUTE} className="twin-link font-medium">
              {t("companyTalentPool.title")}
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && !payload && !errorKey && !authError ? (
        <div data-testid={COMPANY_TALENT_POOL_MARKERS.emptyState}>
          <GuidedEmptyState
            title={t("companyTalentPool.emptyTitle")}
            message={t("companyTalentPool.emptyBody")}
            steps={[t("companyTalentPool.emptyStep1"), t("companyTalentPool.emptyStep2")]}
            actionLabel={t("companyTalentPool.load")}
            onAction={() => void loadPool()}
          />
        </div>
      ) : null}
    </Shell>
  );
}
