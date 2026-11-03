"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { IntelligenceCompactCard } from "@/components/recruiter/intelligence-compact-card";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
} from "@/lib/recruiter-inbox";
import {
  RECRUITER_PIPELINE_FILTERS,
  pipelineScheduledSlotLabel,
  recruiterPipelineFilterLabelKey,
  recruiterPipelineNextActionKey,
  recruiterPipelineStatusLabelKey,
  type RecruiterPipelineFilter,
  type RecruiterPipelineRow,
} from "@/lib/recruiter-pipeline";
import { RECRUITER_SCHEDULING_VISUAL_MARKERS } from "@/lib/recruiter-scheduling";
import { RECRUITER_PIPELINE_SHIP_STATUS } from "@/lib/seven-day-d3-recruiter";

export function RecruiterPipelineClient() {
  const { t, locale } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [rows, setRows] = useState<RecruiterPipelineRow[]>([]);
  const [filter, setFilter] = useState<RecruiterPipelineFilter>("all");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queueLoaded, setQueueLoaded] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(companyRaw, readRecruiterInboxSession().companySlug),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    setLoadError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const statusParam = filter === "all" ? "" : `&status=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/recruiter/pipeline?${q}${statusParam}`);
      if (!res.ok) {
        setLoadError(t("recruiterPipeline.loadFailed"));
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: RecruiterPipelineRow[] };
      setRows(data.items ?? []);
      setQueueLoaded(true);
    } catch {
      setLoadError(t("recruiterPipeline.loadFailed"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, filter, t]);

  return (
    <Shell wide>
      {queueLoaded ? <RecruiterWorkspaceNav /> : null}
      <Card
        variant="soft"
        className="p-5 sm:p-6"
        data-wave2b-recruiter-pipeline-green={RECRUITER_PIPELINE_SHIP_STATUS}
      >
        <h1 className="twin-section-title text-2xl">{t("recruiterPipeline.title")}</h1>
        <p className="twin-muted mt-2 text-sm leading-relaxed">{t("recruiterPipeline.lead")}</p>
        <p className="twin-muted mt-2 text-xs leading-relaxed">{t("recruiterPipeline.boundaryNote")}</p>
        <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
          {t("recruiterScheduling.trustLabel")}
        </p>
        <p className="mt-2 text-sm">
          <Link href="/recruiter/talent-radar" className="font-medium text-[var(--twin-accent)] underline">
            {t("recruiterTalentRadar.navLink")}
          </Link>
          {" · "}
          <Link href="/recruiter/talent-radar/digest" className="font-medium text-[var(--twin-accent)] underline">
            {t("recruiterTalentRadarDigest.digestLink")}
          </Link>
        </p>

        <RecruiterAccessFields
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
        />
        <button type="button" className="twin-btn-solid mt-4 text-sm" disabled={loading} onClick={() => void load()}>
          {loading ? t("common.loadingEllipsis") : t("recruiterInbox.load")}
        </button>

        {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}

        {queueLoaded ? (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {RECRUITER_PIPELINE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    filter === f
                      ? "bg-[var(--twin-accent)]/15 text-[var(--foreground)]"
                      : "text-[var(--twin-muted)] hover:text-[var(--foreground)]"
                  }`}
                  onClick={() => setFilter(f)}
                >
                  {t(`recruiterPipeline.${recruiterPipelineFilterLabelKey(f)}` as TranslationKey)}
                </button>
              ))}
            </div>

            {rows.length === 0 && !loading ? (
              <p className="twin-muted mt-6 text-sm">{t("recruiterPipeline.empty")}</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {rows.map((row) => {
                  const scheduled = pipelineScheduledSlotLabel(row, locale);
                  const nextKey = recruiterPipelineNextActionKey(row.pipeline_status);
                  return (
                    <li
                      key={row.application_id}
                      className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-[var(--foreground)]">{row.candidate_name}</p>
                          <p className="text-sm text-[var(--twin-muted-strong)]">
                            {row.job_title} · {row.company}
                          </p>
                          <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                            {t(`recruiterPipeline.${recruiterPipelineStatusLabelKey(row.pipeline_status)}` as TranslationKey)}
                          </p>
                          {nextKey ? (
                            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                              {t(`recruiterPipeline.${nextKey}` as TranslationKey)}
                            </p>
                          ) : null}
                          {scheduled ? (
                            <p
                              className={`${RECRUITER_SCHEDULING_VISUAL_MARKERS.scheduledBadge} mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400`}
                            >
                              {t("recruiterPipeline.scheduledSlot")}: {scheduled}
                            </p>
                          ) : null}
                          <IntelligenceCompactCard
                            intelligence={row.intelligence}
                            candidateId={row.candidate_id}
                          />
                        </div>
                        <Link
                          href={`/recruiter/inbox?review=${row.application_id}`}
                          className="text-sm font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
                        >
                          {t("recruiterPipeline.openInInbox")}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </Card>
    </Shell>
  );
}
