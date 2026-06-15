"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyTalentPoolNextAction } from "@/components/company/company-talent-pool-next-action";
import { CompanyTalentPoolRadarCta } from "@/components/company/company-talent-pool-radar-cta";
import { CompanyTalentPoolReadinessGuide } from "@/components/company/company-talent-pool-readiness-guide";
import { CompanyTalentPoolWorkspaceSelector } from "@/components/company/company-talent-pool-workspace-selector";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
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
  type CompanyTalentPoolReadinessState,
} from "@/lib/company-talent-pool";
import { resolveCompanyTalentPoolNextBestAction } from "@/lib/company-talent-pool-next-best-action";
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
  "missingLocation",
  "missingSeniority",
  "lowEvidence",
  "missingConsent",
  "staleRecords",
  "duplicates",
] as const;

const QUALITY_DIM_LABEL_KEYS: Record<(typeof QUALITY_DIM_KEYS)[number], TranslationKey> = {
  missingRoleTitle: "companyTalentPool.qualityMissingRoleTitle",
  missingSkills: "companyTalentPool.qualityMissingSkills",
  missingLocation: "companyTalentPool.qualityMissingLocation",
  missingSeniority: "companyTalentPool.qualityMissingSeniority",
  lowEvidence: "companyTalentPool.qualityLowEvidence",
  missingConsent: "companyTalentPool.qualityMissingConsent",
  staleRecords: "companyTalentPool.qualityStaleRecords",
  duplicates: "companyTalentPool.qualityDuplicates",
};

const READINESS_STATE_KEYS: CompanyTalentPoolReadinessState[] = [
  "ready",
  "needs_enrichment",
  "duplicate_review",
  "consent_required",
  "stale",
];

const READINESS_LABEL_KEYS: Record<CompanyTalentPoolReadinessState, TranslationKey> = {
  ready: "companyTalentPool.readinessReady",
  needs_enrichment: "companyTalentPool.readinessNeedsEnrichment",
  duplicate_review: "companyTalentPool.readinessDuplicateReview",
  consent_required: "companyTalentPool.readinessConsentRequired",
  stale: "companyTalentPool.readinessStale",
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
    missingLocation: d.missing_location ?? 0,
    missingSeniority: d.missing_seniority ?? 0,
    lowEvidence: d.low_evidence ?? 0,
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
  const nextBestAction = useMemo(
    () => (payload ? resolveCompanyTalentPoolNextBestAction(payload) : null),
    [payload],
  );

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

      <CompanyTalentPoolWorkspaceSelector
        token={token}
        onTokenChange={setToken}
        companySlug={companyRaw}
        onCompanySlugChange={setCompanyRaw}
        companyOptions={companyOptions}
        loading={loading}
        authError={authError}
        onLoad={() => void loadPool()}
        onDemoCompany={() => {
          setCompanyRaw(RECRUITER_DEMO_COMPANY_SLUG);
          void loadPool();
        }}
      />
      {errorKey ? (
        <p className="-mt-4 mb-8 text-sm text-[var(--twin-danger)]" role="alert">
          {t(errorKey === "loadFailed" ? "companyTalentPool.loadFailed" : (`recruiterInbox.${errorKey}` as TranslationKey))}
        </p>
      ) : null}

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

          {nextBestAction ? <CompanyTalentPoolNextAction action={nextBestAction} /> : null}

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
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            data-testid={COMPANY_TALENT_POOL_MARKERS.roleSkillCoverage}
          >
            <h3 className="text-sm font-semibold">{t("companyTalentPool.roleCoverageTitle")}</h3>
            <p className="twin-muted mt-1 text-xs">{t("companyTalentPool.roleCoverageBody")}</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("companyTalentPool.topRolesTitle")}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {payload.role_skill_coverage.top_roles.map((role) => (
                    <li key={role.title} className="flex justify-between border-b border-[var(--twin-border)]/40 py-1">
                      <span>{role.title}</span>
                      <span className="twin-muted tabular-nums">{fmt(role.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("companyTalentPool.skillCoverageTitle")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {payload.role_skill_coverage.top_skills.map((skill) => (
                    <span
                      key={skill.skill}
                      className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs"
                    >
                      {skill.skill} · {fmt(skill.count)}
                    </span>
                  ))}
                </ul>
              </div>
            </div>
            {payload.role_skill_coverage.weak_coverage.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("companyTalentPool.weakCoverageTitle")}
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {payload.role_skill_coverage.weak_coverage.map((row) => (
                    <li key={row.role_title} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{row.role_title}</span>
                        <span className="twin-muted text-xs tabular-nums">
                          {fmt(row.candidate_count)} · {row.coverage_warning}
                        </span>
                      </div>
                      {row.job_id ? (
                        <span className="mt-2 block">
                          <CompanyTalentPoolRadarCta
                            radarHref={`/recruiter/talent-radar?role_id=${row.job_id}`}
                            recruiterPoolHref={payload.links.recruiter_pool}
                          />
                        </span>
                      ) : (
                        <span className="mt-2 block">
                          <CompanyTalentPoolRadarCta
                            radarHref={payload.links.talent_radar}
                            recruiterPoolHref={payload.links.recruiter_pool}
                          />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {payload.role_skill_coverage.suggested_actions.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                {payload.role_skill_coverage.suggested_actions.map((action) => (
                  <li key={action.code}>
                    <Link href={action.href} className="twin-link font-medium">
                      {action.code === "ask_recruiter_review"
                        ? t("companyTalentPool.askRecruiterReview")
                        : action.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              variant="soft"
              className="border-[var(--twin-border)]/80 p-5"
              data-testid={COMPANY_TALENT_POOL_MARKERS.readinessPanel}
            >
              <h3 className="text-sm font-semibold">{t("companyTalentPool.readinessTitle")}</h3>
              <p className="twin-muted mt-1 text-xs">{t("companyTalentPool.readinessBody")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {READINESS_STATE_KEYS.map((state) => (
                  <span
                    key={state}
                    className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs"
                  >
                    {t(READINESS_LABEL_KEYS[state])}: {fmt(payload.readiness.counts[state] ?? 0)}
                  </span>
                ))}
              </div>
              {payload.readiness.candidates.length > 0 ? (
                <ul className="mt-4 divide-y divide-[var(--twin-border)]/60">
                  {payload.readiness.candidates.map((candidate) => (
                    <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div>
                        <p className="font-medium">{candidate.display_name}</p>
                        <p className="twin-muted text-xs">
                          {candidate.job_title || t("companyTalentPool.noJobTitle")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs">
                          {t(READINESS_LABEL_KEYS[candidate.readiness_state])}
                        </span>
                        <CompanyTalentPoolRadarCta
                          radarHref={candidate.radar_href}
                          recruiterPoolHref={payload.links.recruiter_pool}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="twin-muted mt-4 text-sm">{t("companyTalentPool.readinessEmpty")}</p>
              )}
            </Card>
            <CompanyTalentPoolReadinessGuide
              importHref={payload.links.recruiter_import}
              recruiterPoolHref={payload.links.recruiter_pool}
              integrationsHref={payload.links.integrations}
            />
          </div>

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

          <Card
            variant="soft"
            className="border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/50 p-4"
            data-testid={COMPANY_TALENT_POOL_MARKERS.trustPanel}
          >
            <p className="text-sm leading-relaxed text-[var(--foreground)]">{t("companyTalentPool.trustCopy")}</p>
          </Card>
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
