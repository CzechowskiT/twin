"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationTracker } from "@/components/career/application-tracker";
import { CandidateProfileForm } from "@/components/career/candidate-profile-form";
import { CvAnalyzerPanel } from "@/components/career/cv-analyzer-panel";
import { InterviewPrepPanel } from "@/components/career/interview-prep-panel";
import { JobCard } from "@/components/career/job-card";
import { JobDetailView } from "@/components/career/job-detail-view";
import { JobFilters } from "@/components/career/job-filters";
import { SavedSearchesPanel } from "@/components/career/saved-searches-panel";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  apiJobToListing,
  defaultJobSearchFilters,
  emptyCareerProfile,
  filterJobs,
  groupJobsByCity,
  MOCK_JOBS,
  parseNaturalLanguageSearch,
  type ApiJobRow,
  type CareerCandidateProfile,
  type JobListing,
  type JobSearchFilters,
  type TrackerApplication,
} from "@/lib/career";
import { buildJobsQuery, type JobFilters as LegacyFilters } from "@/lib/jobs";

type ProfileApi = {
  name: string;
  skills: string[];
  experience_years: number;
  desired_salary: number | null;
  location: string | null;
  preferred_job_titles: string[];
  cv_text: string | null;
};

function profileFromApi(p: ProfileApi): CareerCandidateProfile {
  return {
    name: p.name,
    skills: p.skills ?? [],
    experienceYears: p.experience_years ?? 0,
    desiredSalary: p.desired_salary,
    location: p.location,
    preferredJobTitles: p.preferred_job_titles ?? [],
    cvText: p.cv_text,
  };
}

function legacyFiltersFromSearch(f: JobSearchFilters): LegacyFilters {
  return {
    q: f.q,
    location: f.location,
    job_board: f.jobBoard,
    min_salary: f.minSalary,
    title_terms: "",
    sort: f.sort === "match" ? "newest" : f.sort,
  };
}

export function JobDiscoveryHub() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<JobSearchFilters>(defaultJobSearchFilters);
  const [nlQuery, setNlQuery] = useState("");
  const [useLive, setUseLive] = useState(true);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selected, setSelected] = useState<JobListing | null>(null);
  const [profile, setProfile] = useState<CareerCandidateProfile>(emptyCareerProfile());
  const [applications, setApplications] = useState<TrackerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const prof = await apiFetch<ProfileApi>("/api/v1/candidates/me", {}, token);
      setProfile(profileFromApi(prof));
      const apps = await apiFetch<{
        items: {
          id: number;
          job_id: number;
          status: string;
          title: string;
          company: string;
          url: string;
        }[];
      }>("/api/v1/applications/me?limit=50", {}, token);
      setApplications(
        (apps.items ?? []).map((a) => ({
          id: a.id,
          jobId: a.job_id,
          title: a.title,
          company: a.company,
          status: a.status as TrackerApplication["status"],
          url: a.url,
        })),
      );
      if (useLive) {
        const q = buildJobsQuery(legacyFiltersFromSearch(filters), { limit: 100 });
        const res = await apiFetch<{ items: ApiJobRow[] }>(`/api/v1/jobs${q}`, {}, token);
        setJobs((res.items ?? []).map(apiJobToListing));
      } else {
        setJobs(MOCK_JOBS);
      }
    } finally {
      setLoading(false);
    }
  }, [router, useLive, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterJobs(jobs, filters, profile),
    [jobs, filters, profile],
  );
  const byCity = useMemo(() => groupJobsByCity(filtered), [filtered]);

  async function onParseNl(query: string) {
    const partial = await parseNaturalLanguageSearch(query);
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <Shell>
      <header className="mb-6 space-y-2">
        <Link href="/workspace/candidate" className="twin-link text-sm">
          ← {t("careerDiscovery.backWorkspace")}
        </Link>
        <h1 className="text-2xl font-semibold">{t("careerDiscovery.hubTitle")}</h1>
        <p className="twin-muted max-w-2xl text-sm">{t("careerDiscovery.hubLead")}</p>
        <div className="flex flex-wrap gap-2">
          <ButtonChip type="button" onClick={() => setUseLive(true)}>
            {t("careerDiscovery.useLiveFeed")}
          </ButtonChip>
          <ButtonChip type="button" onClick={() => setUseLive(false)}>
            {t("careerDiscovery.useMockFeed")}
          </ButtonChip>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card className="p-4">
            <JobFilters
              filters={filters}
              onChange={setFilters}
              nlQuery={nlQuery}
              onNlChange={setNlQuery}
              onParseNl={onParseNl}
            />
          </Card>
          <SavedSearchesPanel filters={filters} onApply={setFilters} />
          <CandidateProfileForm profile={profile} />
        </aside>
        <div className="grid gap-6 xl:grid-cols-2">
          <section>
            {loading ? (
              <p className="twin-muted text-sm">…</p>
            ) : !filtered.length ? (
              <p className="twin-muted text-sm">{t("careerDiscovery.noJobs")}</p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((job) => (
                  <li key={job.id}>
                    <JobCard
                      job={job}
                      profile={profile}
                      selected={selected?.id === job.id}
                      onSelect={setSelected}
                    />
                  </li>
                ))}
              </ul>
            )}
            <section className="mt-6">
              <h3 className="text-sm font-medium">{t("careerDiscovery.mapStubTitle")}</h3>
              <p className="twin-muted text-xs">{t("careerDiscovery.mapStubLead")}</p>
              <ul className="mt-2 space-y-2 text-xs">
                {Object.entries(byCity).map(([city, list]) => (
                  <li key={city}>
                    <span className="font-medium">{city}</span> ({list.length})
                  </li>
                ))}
              </ul>
            </section>
          </section>
          <section className="space-y-4">
            <JobDetailView job={selected} profile={profile} />
            {selected ? (
              <>
                <CvAnalyzerPanel cvText={profile.cvText} jobTitle={selected.title} />
                <InterviewPrepPanel jobTitle={selected.title} company={selected.company} />
              </>
            ) : null}
          </section>
        </div>
      </div>
      <div className="mt-10">
        <ApplicationTracker applications={applications} />
      </div>
    </Shell>
  );
}
