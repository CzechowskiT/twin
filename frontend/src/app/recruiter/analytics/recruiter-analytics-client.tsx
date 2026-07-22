"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
import { Card, Shell } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import {
  deriveRecruiterAnalyticsSummary,
  RECRUITER_ANALYTICS_MARKERS,
  RECRUITER_ANALYTICS_PAGE_MARKER,
  type RecruiterAnalyticsPayload,
} from "@/lib/recruiter-analytics";
import {
  RECRUITER_SLA_API_PATH,
  RECRUITER_SLA_MARKERS,
  type RecruiterSlaSummary,
} from "@/lib/recruiter-sla";
import { RECRUITER_ANALYTICS_SHIP_STATUS } from "@/lib/seven-day-d3-recruiter";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

const NEXT_ACTION_KEYS: Record<
  ReturnType<typeof deriveRecruiterAnalyticsSummary>["nextActionKey"],
  TranslationKey
> = {
  review_inbox: "recruiterAnalytics.nextActionReviewInbox",
  advance_pipeline: "recruiterAnalytics.nextActionAdvancePipeline",
  publish_role: "recruiterAnalytics.nextActionPublishRole",
  all_clear: "recruiterAnalytics.nextActionAllClear",
};

const NEXT_ACTION_HREFS: Record<
  ReturnType<typeof deriveRecruiterAnalyticsSummary>["nextActionKey"],
  string
> = {
  review_inbox: "/recruiter/inbox",
  advance_pipeline: "/recruiter/pipeline",
  publish_role: "/recruiter/jobs",
  all_clear: "/recruiter/inbox",
};

export default function RecruiterAnalyticsClient() {
  const { t, locale } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<RecruiterAnalyticsPayload | null>(null);
  const [sla, setSla] = useState<RecruiterSlaSummary | null>(null);
  const [activeRoles, setActiveRoles] = useState(0);
  const [loading, setLoading] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(companyRaw, readRecruiterInboxSession().companySlug),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);
  const summary = useMemo(
    () => (payload ? deriveRecruiterAnalyticsSummary(payload, activeRoles) : null),
    [payload, activeRoles],
  );

  useEffect(() => {
    const s = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(s.token);
      setCompanyRaw(s.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const [analyticsRes, jobsRes, slaRes] = await Promise.all([
        fetch(`/api/recruiter/analytics?${q}`),
        fetch(`/api/recruiter/jobs?${q}`, { cache: "no-store" }),
        fetch(`${RECRUITER_SLA_API_PATH}?${q}`, { cache: "no-store" }),
      ]);
      if (analyticsRes.ok) {
        setPayload((await analyticsRes.json()) as RecruiterAnalyticsPayload);
      } else {
        setPayload(null);
      }
      if (jobsRes.ok) {
        const jobsData = (await jobsRes.json()) as { items?: unknown[] };
        setActiveRoles(jobsData.items?.length ?? 0);
      } else {
        setActiveRoles(0);
      }
      if (slaRes.ok) {
        setSla((await slaRes.json()) as RecruiterSlaSummary);
      } else {
        setSla(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  return (
    <Shell wide>
      <div
        data-recruiter-analytics-page={RECRUITER_ANALYTICS_PAGE_MARKER}
        data-seven-day-recruiter-analytics
      >
        <RecruiterWorkspaceNav />
        <WorkspacePilotPageHeader
          eyebrowKey="workspaceModules.hubEyebrow"
          titleKey="recruiterAnalytics.title"
          leadKey="recruiterAnalytics.lead"
          status={RECRUITER_ANALYTICS_SHIP_STATUS}
        />
        <Card variant="soft" className="mb-6 p-4" data-testid={RECRUITER_ANALYTICS_MARKERS.accessFields}>
          <RecruiterAccessFields
            token={token}
            companySlug={companyRaw}
            companyOptions={companyOptions}
            onTokenChange={setToken}
            onCompanySlugChange={setCompanyRaw}
          />
          <button
            type="button"
            className="twin-btn-primary mt-4"
            disabled={loading}
            data-testid={RECRUITER_ANALYTICS_MARKERS.loadButton}
            onClick={() => void load()}
          >
            {loading ? t("recruiterAnalytics.loading") : t("recruiterAnalytics.load")}
          </button>
        </Card>
        {payload && summary ? (
          <div className="space-y-6" data-seven-day-recruiter-analytics-summary>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card variant="soft" className="p-4" data-metric="active_roles">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricActiveRoles")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(summary.activeRoles)}</p>
              </Card>
              <Card variant="soft" className="p-4" data-metric="candidates_reviewed">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricCandidatesReviewed")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(summary.candidatesReviewed)}</p>
              </Card>
              <Card variant="soft" className="p-4" data-metric="shortlist_ready">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricShortlistReady")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(summary.shortlistReady)}</p>
              </Card>
              <Card variant="soft" className="p-4" data-metric="pipeline_health">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricPipelineHealth")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.pipelineHealthPct}%</p>
              </Card>
              <Card variant="soft" className="p-4" data-metric="applications">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricApplications")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.applications_total)}</p>
              </Card>
              <Card variant="soft" className="p-4" data-metric="decisions">
                <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricDecisions")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.audit_decisions)}</p>
              </Card>
            </div>
            {summary.statusRows.length > 0 ? (
              <Card variant="soft" className="p-4" data-metric="status_distribution">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterAnalytics.statusDistributionTitle")}</h2>
                <ul className="mt-3 space-y-2">
                  {summary.statusRows.map((row) => (
                    <li key={row.status} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--twin-muted-strong)]">{row.status}</span>
                      <span className="font-medium tabular-nums">{fmt(row.count)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
            <Card variant="soft" className="p-4" data-testid={RECRUITER_SLA_MARKERS.panel} data-metric="sla_tracking">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterAnalytics.slaTitle")}</h2>
              <p className="twin-muted mt-1 text-xs">{t("recruiterAnalytics.slaLead")}</p>
              {sla ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <p data-testid={RECRUITER_SLA_MARKERS.openCount}>
                      <span className="text-[var(--twin-muted)]">{t("recruiterAnalytics.slaOpen")}: </span>
                      <span className="font-semibold tabular-nums">{fmt(sla.open_count)}</span>
                    </p>
                    <p data-testid={RECRUITER_SLA_MARKERS.breachCount}>
                      <span className="text-[var(--twin-muted)]">{t("recruiterAnalytics.slaBreaches")}: </span>
                      <span className="font-semibold tabular-nums">{fmt(sla.breach_count)}</span>
                    </p>
                  </div>
                  {Object.keys(sla.by_stage ?? {}).length ? (
                    <ul className="space-y-2">
                      {Object.entries(sla.by_stage).map(([stage, row]) => {
                        const target =
                          sla.targets.find((x) => x.stage_key === stage)?.target_hours ?? "—";
                        return (
                          <li
                            key={stage}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span className="text-[var(--twin-muted-strong)]">
                              {t("recruiterAnalytics.slaStage")}: {stage}
                            </span>
                            <span className="tabular-nums">
                              {fmt(row.open)} open · {fmt(row.breached)} past · {target}h
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="twin-muted text-xs">{t("recruiterAnalytics.slaEmpty")}</p>
                  )}
                </div>
              ) : (
                <p className="twin-muted mt-2 text-xs">{t("recruiterAnalytics.slaEmpty")}</p>
              )}
            </Card>
            <Card variant="soft" className="border-[var(--twin-accent)]/20 p-4" data-metric="next_action">
              <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.nextActionTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                {t(NEXT_ACTION_KEYS[summary.nextActionKey])}
              </p>
              <Link href={NEXT_ACTION_HREFS[summary.nextActionKey]} className="twin-link mt-3 inline-block text-sm font-medium">
                {t("recruiterAnalytics.nextActionCta")} →
              </Link>
            </Card>
            <p className="twin-muted text-xs">
              {t("recruiterAnalytics.dataSourceNote")}
              {payload.window_days
                ? ` ${t("recruiterAnalytics.windowDays").replace("{days}", String(payload.window_days))}`
                : null}
            </p>
          </div>
        ) : (
          <Card variant="soft" className="p-5">
            <p className="font-medium text-[var(--foreground)]">{t("recruiterAnalytics.emptyTitle")}</p>
            <p className="twin-muted mt-2 text-sm">{t("recruiterAnalytics.emptyBody")}</p>
          </Card>
        )}
        <p className="twin-muted mt-6 text-xs">{t("recruiterAnalytics.notLiveNote")}</p>
      </div>
    </Shell>
  );
}
