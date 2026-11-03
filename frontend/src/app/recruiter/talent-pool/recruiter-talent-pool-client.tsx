"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { IntelligenceCompactCard } from "@/components/recruiter/intelligence-compact-card";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
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
  addRecruiterTalentPoolCandidate,
  archiveRecruiterTalentPoolRecord,
  fetchRecruiterTalentPoolDetail,
} from "@/lib/recruiter-talent-pool-api";
import {
  TALENT_POOL_LIMITED_PILOT,
} from "@/lib/seven-day-d3-recruiter";
import {
  RECRUITER_TALENT_POOL_IMPORT_ROUTE,
  RECRUITER_TALENT_POOL_MARKERS,
  RECRUITER_TALENT_POOL_ROUTE,
  type TalentPoolPayload,
  type TalentPoolRecord,
} from "@/lib/recruiter-talent-pool";

export default function RecruiterTalentPoolClient() {
  const { t } = useTranslation();
  const { fetch: fetchAbortable } = useAbortableFetch();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<TalentPoolPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TalentPoolRecord | null>(null);
  const [addName, setAddName] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addSkills, setAddSkills] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);

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
      const params = new URLSearchParams(q);
      if (filter.trim()) params.set("search", filter.trim());
      const res = await fetchAbortable(`/api/recruiter/talent-pool?${params.toString()}`);
      if (res.ok) setPayload((await res.json()) as TalentPoolPayload);
      else setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, filter, fetchAbortable]);

  const openDetail = useCallback(async (recordId: number) => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setSelectedId(recordId);
    const row = await fetchRecruiterTalentPoolDetail(tkn, slug, recordId);
    setDetail(row);
  }, [token, companySlug]);

  const handleAdd = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug || !addName.trim()) return;
    setAddBusy(true);
    setAddMessage(null);
    try {
      const skills = addSkills.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      const out = await addRecruiterTalentPoolCandidate(tkn, slug, {
        display_name: addName.trim(),
        job_title: addTitle.trim() || undefined,
        skills,
      });
      if (!out) {
        setAddMessage(t("recruiterTalentPool.addFailed"));
        return;
      }
      setAddMessage(out.duplicate ? t("recruiterTalentPool.addDuplicate") : t("recruiterTalentPool.addSuccess"));
      setAddName("");
      setAddTitle("");
      setAddSkills("");
      await load();
    } finally {
      setAddBusy(false);
    }
  }, [token, companySlug, addName, addTitle, addSkills, load, t]);

  const handleArchive = useCallback(async () => {
    if (!selectedId) return;
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    const archived = await archiveRecruiterTalentPoolRecord(tkn, slug, selectedId);
    if (archived) {
      setDetail(archived);
      await load();
    }
  }, [selectedId, token, companySlug, load]);

  return (
    <Shell wide data-testid={RECRUITER_TALENT_POOL_MARKERS.page}>
      <RecruiterWorkspaceNav />
      <WorkspacePilotPageHeader
        eyebrowKey="recruiterTalentPool.eyebrow"
        titleKey="recruiterTalentPool.title"
        leadKey="recruiterTalentPool.lead"
        status="pilot"
      />
      {TALENT_POOL_LIMITED_PILOT ? (
        <p className="twin-muted mb-4 text-sm leading-relaxed" data-seven-day-talent-pool-pilot-boundary>
          {t("recruiterTalentPool.pilotBoundaryBody")}
        </p>
      ) : null}

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
        <div className="mt-4">
          <label className="twin-muted mb-1 block text-xs" htmlFor="talent-pool-filter">
            {t("recruiterTalentPool.filterLabel")}
          </label>
          <input
            id="talent-pool-filter"
            className="twin-input w-full max-w-md"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid={RECRUITER_TALENT_POOL_MARKERS.filterInput}
            placeholder={t("recruiterTalentPool.filterPlaceholder")}
          />
        </div>
      </Card>

      <Card variant="soft" className="mb-6 p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.addForm}>
        <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPool.addTitle")}</h2>
        <p className="twin-muted mb-3 text-xs">{t("recruiterTalentPool.addBody")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="twin-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={t("recruiterTalentPool.addNamePlaceholder")} aria-label={t("recruiterTalentPool.addNamePlaceholder")} />
          <input className="twin-input" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder={t("recruiterTalentPool.addJobTitlePlaceholder")} aria-label={t("recruiterTalentPool.addJobTitlePlaceholder")} />
          <input className="twin-input" value={addSkills} onChange={(e) => setAddSkills(e.target.value)} placeholder={t("recruiterTalentPool.addSkillsPlaceholder")} aria-label={t("recruiterTalentPool.addSkillsPlaceholder")} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="twin-btn-secondary" disabled={addBusy || !addName.trim()} onClick={() => void handleAdd()}>
            {addBusy ? t("recruiterTalentPool.adding") : t("recruiterTalentPool.addCta")}
          </button>
          {addMessage ? <p className="text-xs text-[var(--twin-muted-strong)]">{addMessage}</p> : null}
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
                      <button type="button" className="text-left" onClick={() => void openDetail(rec.id)}>
                        <p className="font-medium twin-link">{rec.display_name}</p>
                        <p className="twin-muted text-xs">{rec.job_title || t("recruiterTalentPool.noJobTitle")}</p>
                      </button>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs">
                        {rec.source_type === "manual_add" ? t("recruiterTalentPool.chipManualAdd") : t("recruiterTalentPool.chipTalentPool")}
                      </span>
                    </div>
                    {rec.skills && rec.skills.length > 0 ? (
                      <p className="twin-muted mt-1 text-xs">{rec.skills.slice(0, 5).join(" · ")}</p>
                    ) : null}
                    <IntelligenceCompactCard
                      intelligence={rec.intelligence}
                      candidateId={
                        rec.candidate_id && /^\d+$/.test(rec.candidate_id)
                          ? Number(rec.candidate_id)
                          : null
                      }
                    />
                    {rec.consent_visibility ? (
                      <p className="twin-muted mt-1 text-[10px] uppercase">{t("recruiterTalentPool.consentLabel")}: {rec.consent_visibility}</p>
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
          {detail ? (
            <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.detailPanel}>
              <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPool.detailTitle")}</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="twin-muted">{t("recruiterTalentPool.addNamePlaceholder")}</dt><dd>{detail.display_name}</dd></div>
                <div><dt className="twin-muted">{t("recruiterTalentPool.addJobTitlePlaceholder")}</dt><dd>{detail.job_title || "—"}</dd></div>
                <div><dt className="twin-muted">{t("recruiterTalentPool.consentLabel")}</dt><dd>{detail.consent_visibility || "unknown"}</dd></div>
                <div><dt className="twin-muted">{t("recruiterTalentPool.sourceLabel")}</dt><dd>{detail.source_type || detail.source}</dd></div>
              </dl>
              {detail.snapshot ? (
                <pre className="mt-3 overflow-x-auto rounded border border-white/10 p-2 text-xs">{JSON.stringify(detail.snapshot, null, 2)}</pre>
              ) : null}
              {!detail.archived ? (
                <button type="button" className="twin-btn-secondary mt-3" data-testid={RECRUITER_TALENT_POOL_MARKERS.archiveButton} onClick={() => void handleArchive()}>
                  {t("recruiterTalentPool.archiveCta")}
                </button>
              ) : (
                <p className="twin-muted mt-3 text-xs">{t("recruiterTalentPool.archivedLabel")}</p>
              )}
            </Card>
          ) : null}
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
