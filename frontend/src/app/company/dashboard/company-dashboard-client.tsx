"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { WorkspaceModuleGrid } from "@/components/workspace/workspace-module-grid";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
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
import { COMPANY_WORKSPACE_MODULES } from "@/lib/company-workspace-modules";

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

      <section className="mb-8" data-testid="company-module-grid">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("workspaceModules.hubEyebrow")}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{t("workspaceModules.companyHubTitle")}</h2>
        <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("workspaceModules.companyHubLead")}</p>
        <div className="mt-4">
          <WorkspaceModuleGrid modules={COMPANY_WORKSPACE_MODULES} />
        </div>
      </section>

      <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
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

      {!payload && !loading ? (
        <GuidedEmptyState
          title={t("companyHiring.emptyTitle")}
          message={t("companyHiring.emptyBody")}
          steps={[t("companyHiring.emptyStep1"), t("companyHiring.emptyStep2")]}
          actionLabel={t("companyHiring.load")}
          onAction={() => void load()}
        />
      ) : null}

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
