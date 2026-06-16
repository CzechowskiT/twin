"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { useAbortableFetch } from "@/hooks/use-abortable-fetch";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import {
  RECRUITER_TALENT_POOL_IMPORT_ROUTE,
  RECRUITER_TALENT_POOL_MARKERS,
  RECRUITER_TALENT_POOL_ROUTE,
  type TalentPoolPayload,
} from "@/lib/recruiter-talent-pool";

export default function RecruiterTalentPoolClient() {
  const { t } = useTranslation();
  const { fetch: fetchAbortable } = useAbortableFetch();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<TalentPoolPayload | null>(null);
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
      const res = await fetchAbortable(`/api/recruiter/talent-pool?${q}`);
      if (res.ok) setPayload((await res.json()) as TalentPoolPayload);
      else setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, fetchAbortable]);

  return (
    <Shell wide data-testid={RECRUITER_TALENT_POOL_MARKERS.page}>
      <RecruiterWorkspaceNav />
      <header className="mb-6 space-y-3">
        <p className="twin-eyebrow text-xs uppercase tracking-widest text-[var(--twin-accent)]">
          {t("recruiterTalentPool.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold">{t("recruiterTalentPool.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm">{t("recruiterTalentPool.lead")}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{t("recruiterTalentPool.chipPilot")}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{t("recruiterTalentPool.chipNoLiveSync")}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{t("recruiterTalentPool.chipInternalOnly")}</span>
        </div>
      </header>

      <Card variant="soft" className="mb-6 p-4">
        <RecruiterAccessFields
          token={token}
          companySlug={companyRaw}
          companyOptions={companyOptions}
          onTokenChange={setToken}
          onCompanySlugChange={setCompanyRaw}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="twin-btn-primary" disabled={loading} onClick={() => void load()}>
            {loading ? t("recruiterTalentPool.loading") : t("recruiterTalentPool.loadPool")}
          </button>
          <Link
            href={RECRUITER_TALENT_POOL_IMPORT_ROUTE}
            className="twin-btn-secondary"
            data-testid={RECRUITER_TALENT_POOL_MARKERS.importLink}
          >
            {t("recruiterTalentPool.importCta")}
          </Link>
        </div>
      </Card>

      {payload ? (
        <div className="space-y-6">
          <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.summaryPanel}>
            <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPool.summaryTitle")}</h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div><dt className="twin-muted">{t("recruiterTalentPool.totalRecords")}</dt><dd className="text-lg font-semibold">{payload.summary.total_records}</dd></div>
              <div><dt className="twin-muted">{t("recruiterTalentPool.qualityHigh")}</dt><dd className="text-lg font-semibold">{payload.summary.quality_high}</dd></div>
              <div><dt className="twin-muted">{t("recruiterTalentPool.qualityMedium")}</dt><dd className="text-lg font-semibold">{payload.summary.quality_medium}</dd></div>
              <div><dt className="twin-muted">{t("recruiterTalentPool.importBatches")}</dt><dd className="text-lg font-semibold">{payload.summary.import_batches}</dd></div>
            </dl>
          </Card>

          <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.qualityPanel}>
            <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPool.dataQualityTitle")}</h2>
            <p className="twin-muted mb-3 text-xs">{t("recruiterTalentPool.dataQualityBody")}</p>
            {payload.data_quality.top_warnings.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {payload.data_quality.top_warnings.map((w) => (
                  <li key={w.code} className="flex justify-between border-b border-white/5 py-1">
                    <span>{w.code}</span>
                    <span className="twin-muted">{w.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="twin-muted text-sm">{t("recruiterTalentPool.noQualityWarnings")}</p>
            )}
          </Card>

          <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.sourceCoverage}>
            <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPool.sourceCoverageTitle")}</h2>
            <p className="twin-muted mb-2 text-xs">{payload.scope_note}</p>
            <ul className="space-y-1 text-sm">
              <li>{t("recruiterTalentPool.sourceInternalPool")}: {payload.source_coverage.imported_internal_pool}</li>
              <li>{t("recruiterTalentPool.sourceExternalSourcing")}: {payload.source_coverage.external_sourcing ? "yes" : t("recruiterTalentPool.notConnected")}</li>
              <li>{t("recruiterTalentPool.sourceLiveAtsSync")}: {payload.source_coverage.live_ats_sync ? "yes" : t("recruiterTalentPool.notConnected")}</li>
            </ul>
          </Card>

          {payload.items.length > 0 ? (
            <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.recordsList}>
              <h2 className="mb-3 text-sm font-semibold">{t("recruiterTalentPool.recordsTitle")}</h2>
              <ul className="divide-y divide-white/5">
                {payload.items.map((rec) => (
                  <li key={rec.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{rec.display_name}</p>
                        <p className="twin-muted text-xs">{rec.job_title || t("recruiterTalentPool.noJobTitle")}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs">
                        {t("recruiterTalentPool.chipTalentPool")}
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
            <div data-testid={RECRUITER_TALENT_POOL_MARKERS.emptyState}>
              <GuidedEmptyState
                title={t("recruiterTalentPool.emptyTitle")}
                message={t("recruiterTalentPool.emptyBody")}
                steps={[t("recruiterTalentPool.emptyStep1"), t("recruiterTalentPool.emptyStep2")]}
                actionHref={RECRUITER_TALENT_POOL_IMPORT_ROUTE}
                actionLabel={t("recruiterTalentPool.emptyCta")}
              />
            </div>
          )}
        </div>
      ) : null}

      <footer className="mt-8 space-y-2 border-t border-white/10 pt-4 text-xs twin-muted">
        <p>{t("recruiterTalentPool.trustCopy")}</p>
        <p>
          <Link href={RECRUITER_TALENT_POOL_ROUTE} className="underline">{t("recruiterTalentPool.title")}</Link>
          {" · "}
          <Link href="/recruiter/talent-radar" className="underline">{t("recruiterTalentPool.linkTalentRadar")}</Link>
          {" · "}
          <Link href="/recruiter/search" className="underline">{t("recruiterTalentPool.linkSearch")}</Link>
        </p>
      </footer>
    </Shell>
  );
}
