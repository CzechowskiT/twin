"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Shell } from "@/components/ui";
import { useTranslation } from "@/components/language-provider";
import { JobCard, type CompetitiveJobRow } from "@/components/job/JobCard";
import { RequirementsSplit } from "@/components/job/RequirementsSplit";
import { InterviewProcessTimeline } from "@/components/job/InterviewProcessTimeline";
import { ApplyTrackingCounter } from "@/components/job/ApplyTrackingCounter";
import { SalaryCalculator } from "@/components/tools/SalaryCalculator";
import { TechStackIcons } from "@/components/job/TechStackIcons";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type JobListResponse = {
  items: CompetitiveJobRow[];
  total: number;
};

type JobDetail = CompetitiveJobRow & {
  description?: string | null;
  requirements_must_have: string[];
  requirements_nice_to_have: string[];
  interview_process: { stage: string; label: string; duration?: string | null }[];
};

type ApplyStats = { apply_count: number; recent_applies_7d: number };

type SkillMatch = { skill_match_percent: number; band: string };

export function CandidateJobDiscovery() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CompetitiveJobRow[]>([]);
  const [selected, setSelected] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enrichJob = useCallback(async (row: CompetitiveJobRow, token: string) => {
    const [match, stats] = await Promise.all([
      apiFetch<SkillMatch>(`/api/v1/jobs/${row.id}/match-score`, {}, token).catch(() => null),
      apiFetch<ApplyStats>(`/api/v1/jobs/${row.id}/apply-stats`, {}, token).catch(() => null),
    ]);
    return {
      ...row,
      skill_match_percent: match?.skill_match_percent ?? row.score ?? null,
      skill_band: match?.band ?? null,
      apply_count: stats?.apply_count ?? 0,
      apply_recent: stats?.recent_applies_7d ?? 0,
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const list = await apiFetch<JobListResponse>("/api/v1/jobs/?limit=30", {}, token);
        const enriched = await Promise.all(list.items.map((j) => enrichJob(j, token)));
        setJobs(enriched);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("jobBoard.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [enrichJob, t]);

  async function selectJob(row: CompetitiveJobRow) {
    const token = getToken();
    if (!token) return;
    try {
      const detail = await apiFetch<JobDetail>(`/api/v1/jobs/${row.id}`, {}, token);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("jobBoard.loadError"));
    }
  }

  return (
    <Shell>
      <header className="mb-6">
        <p className="twin-muted text-xs uppercase tracking-wide">{t("dashboard.jobs")}</p>
        <h1 className="text-xl font-semibold">{t("jobBoard.discoveryTitle")}</h1>
        <p className="twin-muted mt-1 max-w-2xl text-sm">{t("jobBoard.discoveryLead")}</p>
        <Link href="/dashboard" className="twin-muted mt-2 inline-block text-xs underline">
          {t("dashboard.title")}
        </Link>
      </header>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="twin-muted text-sm">{t("dashboard.jobsLoading")}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          {!loading && jobs.length === 0 ? (
            <p className="twin-muted text-sm">{t("dashboard.noJobs")}</p>
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selected?.id === job.id}
                onSelect={() => void selectJob(job)}
              />
            ))
          )}
        </section>

        <aside className="space-y-4">
          <SalaryCalculator jobMin={selected?.salary_min} jobMax={selected?.salary_max} />
          {selected ? (
            <Card className="space-y-4 p-4">
              <div>
                <h2 className="font-medium">{selected.title}</h2>
                <p className="twin-muted text-xs">{selected.company}</p>
                <div className="mt-2">
                  <TechStackIcons stack={selected.tech_stack ?? []} max={10} />
                </div>
              </div>
              <ApplyTrackingCounter
                count={selected.apply_count ?? 0}
                recent={selected.apply_recent}
              />
              <RequirementsSplit
                mustHave={selected.requirements_must_have ?? []}
                niceToHave={selected.requirements_nice_to_have ?? []}
              />
              <InterviewProcessTimeline stages={selected.interview_process ?? []} />
            </Card>
          ) : (
            <Card className="p-4">
              <p className="twin-muted text-sm">{t("jobBoard.selectJobHint")}</p>
            </Card>
          )}
        </aside>
      </div>
    </Shell>
  );
}
