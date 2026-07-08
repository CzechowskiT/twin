"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyHubNextAction } from "@/components/company/company-hub-next-action";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  COMPANY_HIRING_COCKPIT_MARKERS,
  companyHiringCockpitHref,
} from "@/lib/company-hiring-cockpit";
import {
  COMPANY_HIRING_COMMAND_CENTER_MARKERS,
  companyHiringCommandCenterHref,
} from "@/lib/company-hiring-command-center";
import {
  type CompanyHiringDashboardPayload,
} from "@/lib/company-hiring-dashboard";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  companySlugToLabel,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import { SHOW_COMPANY_ONBOARDING_EMPTY_STATE } from "@/lib/product-polish-p1";
import {
  SHOW_COMPANY_HUB_NEXT_ACTION,
  SHOW_COMPANY_HUB_PRIMARY_PROMOS,
  SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED,
} from "@/lib/seven-day-d4-company";

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      {hint ? <p className="twin-muted mt-2 text-xs leading-relaxed">{hint}</p> : null}
    </Card>
  );
}

export default function CompanyDashboardClient() {
  const { t, locale } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<CompanyHiringDashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  useEffect(() => {
    const session = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(session.token);
      setCompanyRaw(session.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setPayload(null);
      return;
    }
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/dashboard?${q}`, { cache: "no-store" });
      if (!res.ok) {
        setPayload(null);
        return;
      }
      setPayload((await res.json()) as CompanyHiringDashboardPayload);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  const segmentKeys = ["in_review", "accepted", "invited", "rejected", "on_hold"] as const;
  const segmentLabelKeys: Record<(typeof segmentKeys)[number], TranslationKey> = {
    in_review: "companyPipeline.metricInReview",
    accepted: "companyPipeline.metricAccepted",
    invited: "companyPipeline.metricInvited",
    rejected: "companyPipeline.metricRejected",
    on_hold: "companyPipeline.metricOnHold",
  };
  const companyLabel = companySlugToLabel(companySlug || companyRaw);

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("companyHiring.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("companyHiring.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("companyHiring.lead")}</p>
      </header>

      {!payload && !loading && SHOW_COMPANY_ONBOARDING_EMPTY_STATE ? (
        <GuidedEmptyState
          title={t("companyHiring.onboardingTitle")}
          message={t("companyHiring.onboardingBody")}
          steps={[
            t("companyHiring.onboardingStep1"),
            t("companyHiring.onboardingStep2"),
            t("companyHiring.onboardingStep3"),
          ]}
          actionLabel={t("companyHiring.onboardingCta")}
          actionHref="#company-workspace-connect"
        />
      ) : null}

      {SHOW_COMPANY_HUB_PRIMARY_PROMOS ? (
        <Link
          href={companyHiringCockpitHref()}
          data-testid={COMPANY_HIRING_COCKPIT_MARKERS.hubPromo}
          className="mb-6 block rounded-2xl transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]"
        >
          <Card
            variant="soft"
            className="border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-[var(--twin-surface-2)]/60 p-5 sm:p-6"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300">
              {t("companyHiringCockpit.pageEyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{t("companyHiringCockpit.title")}</h2>
            <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("companyHiringCockpit.lead")}</p>
            <p className="mt-4 text-sm font-medium text-[var(--twin-accent)]">{t("companyHiringCockpit.openHiringCockpit")} →</p>
          </Card>
        </Link>
      ) : null}
      {!SHOW_COMPANY_HUB_PRIMARY_PROMOS && SHOW_COMPANY_HUB_ROADMAP_PROMOS_COLLAPSED ? (
        <details
          className="mb-6 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/30 p-4"
          data-company-hub-roadmap-promos
          data-seven-day-company-roadmap-promos-collapsed
        >
          <summary className="twin-link cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
            {t("productPolish.companyRoadmapPromosToggle")}
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={companyHiringCockpitHref()}
              data-testid={COMPANY_HIRING_COCKPIT_MARKERS.hubPromo}
              className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 text-sm transition hover:border-[var(--twin-accent)]/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("productPolish.limitedPilotLabel")}
              </p>
              <p className="mt-2 font-medium text-[var(--foreground)]">{t("companyHiringCockpit.title")}</p>
              <p className="twin-muted mt-1 text-xs leading-relaxed">{t("companyHiringCockpit.lead")}</p>
              <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">{t("companyHiringCockpit.openHiringCockpit")} →</p>
            </Link>
            <Link
              href={companyHiringCommandCenterHref()}
              data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.navLink}
              className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 text-sm transition hover:border-[var(--twin-accent)]/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("productPolish.limitedPilotLabel")}
              </p>
              <p className="mt-2 font-medium text-[var(--foreground)]">{t("companyHiringCommandCenter.title")}</p>
              <p className="twin-muted mt-1 text-xs leading-relaxed">{t("companyHiringCommandCenter.lead")}</p>
              <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">{t("companyHiringCommandCenter.openCommandCenter")} →</p>
            </Link>
          </div>
        </details>
      ) : null}
      {!SHOW_COMPANY_HUB_PRIMARY_PROMOS && SHOW_COMPANY_HUB_NEXT_ACTION ? <CompanyHubNextAction /> : null}

      <div className="mb-8" data-testid="company-module-grid">
        <SystemOfRecordNavigationHub
          persona="company"
          titleKey="workspaceModules.companyHubTitle"
          leadKey="systemOfRecord.companyHubLead"
        />
      </div>

      <details
        id="company-workspace-connect"
        className="mb-6 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/30 p-4"
        open={Boolean(payload)}
      >
        <summary className="twin-link cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
          {t("companyHiring.connectWorkspaceToggle")}
        </summary>
        <Card variant="soft" className="mt-4 border-[var(--twin-border)]/80 p-4">
          <RecruiterAccessFields
            token={token}
            companySlug={companyRaw}
            companyOptions={companyOptions}
            onTokenChange={setToken}
            onCompanySlugChange={setCompanyRaw}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !token.trim() || !companySlug}
            className="twin-btn-primary mt-4 disabled:opacity-50"
          >
            {loading ? t("companyHiring.loading") : t("companyHiring.load")}
          </button>
        </Card>
      </details>

      {payload ? (
        <div className="space-y-8">
          <p className="text-sm text-[var(--twin-muted-strong)]">
            {t("companyHiring.workspaceLine").replace("{company}", payload.company_slug)}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t("companyHiring.metricRolesTotal")} value={fmt(payload.roles_total)} />
            <MetricCard label={t("companyHiring.metricRolesActive")} value={fmt(payload.roles_active)} />
            <MetricCard
              label={t("companyHiring.metricApplications")}
              value={fmt(payload.pipeline_total_applications)}
            />
            <MetricCard
              label={t("companyHiring.metricTeamTokens")}
              value={fmt(payload.team_tokens)}
              hint={t("companyHiring.metricTeamTokensHint")}
            />
          </div>

          <section>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t("companyHiring.pipelineTitle")}</h2>
            <p className="twin-muted mt-1 text-sm">{t("companyHiring.pipelineLead")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {segmentKeys.map((key) => (
                <MetricCard
                  key={key}
                  label={t(segmentLabelKeys[key])}
                  value={fmt(payload.pipeline_segments[key] ?? 0)}
                />
              ))}
            </div>
          </section>

          <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("companyHiring.readinessTitle")}</h2>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("companyHiring.readinessBody")}</p>
            <ul className="twin-muted mt-3 list-inside list-disc text-sm">
              <li>{t("companyHiring.readinessBilling")}</li>
              <li>{t("companyHiring.readinessLaunch")}</li>
            </ul>
          </Card>

          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href={payload.links.roles} className="twin-link font-medium">
              {t("companyJobs.navRoles")}
            </Link>
            <Link href={payload.links.pipeline} className="twin-link font-medium">
              {t("companyPipeline.navLink")}
            </Link>
            <Link href={payload.links.team} className="twin-link font-medium">
              {t("companyTeam.navTeam")}
            </Link>
            <Link href={payload.links.inbox} className="twin-link font-medium">
              {t("companyJobs.navInbox")}
            </Link>
          </nav>
        </div>
      ) : null}
    </Shell>
  );
}
