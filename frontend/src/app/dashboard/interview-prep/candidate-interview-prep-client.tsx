"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { CANDIDATE_INTERVIEW_PREP_ROUTE } from "@/lib/candidate-interview-prep";

type ApplicationRow = { id: number; title: string; company: string };
type PrepPack = {
  questions_to_expect?: string[];
  questions_to_ask?: string[];
  star_stories?: { prompt: string; angle: string }[];
  company_talking_points?: string[];
  day_of_checklist?: string[];
};

export default function CandidateInterviewPrepClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prep, setPrep] = useState<PrepPack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login/candidate");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ items: ApplicationRow[] }>(
        "/api/v1/applications/me?limit=50",
        {},
        token,
      );
      const items = data.items ?? [];
      setApplications(items);
      if (items.length > 0) setSelectedId(items[0].id);
    } catch {
      clearToken();
      router.push("/login/candidate");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    const token = getToken();
    if (!token || selectedId == null) return;
    setGenerating(true);
    setError(null);
    setPrep(null);
    try {
      const res = await apiFetch<{ prep: PrepPack }>(
        "/api/v1/career-assistant/interview-prep",
        { method: "POST", body: JSON.stringify({ application_id: selectedId }) },
        token,
      );
      setPrep(res.prep);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("candidateInterviewPrep.prepFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const selected = applications.find((a) => a.id === selectedId);

  return (
    <Shell wide>
      <CandidateWorkspaceSubnav ariaLabel={t("candidateInterviewPrep.title")} />
      <header className="mb-8 mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("candidateInterviewPrep.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("candidateInterviewPrep.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("candidateInterviewPrep.lead")}</p>
        </div>
        <DemoJourneyPilotStatus status="pilot" />
      </header>

      <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
        <h2 className="text-sm font-semibold">{t("candidateInterviewPrep.selectTitle")}</h2>
        {loading ? <p className="twin-muted mt-2 text-sm">{t("candidateInterviewPrep.loading")}</p> : null}
        {!loading && applications.length === 0 ? (
          <p className="twin-muted mt-2 text-sm">{t("candidateInterviewPrep.empty")}</p>
        ) : null}
        {!loading && applications.length > 0 ? (
          <div className="mt-3 space-y-3">
            <label className="block text-xs">
              <span className="text-[var(--twin-muted)]">{t("candidateInterviewPrep.fieldApplication")}</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.title} — {app.company}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={generating || selectedId == null} onClick={() => void generate()}>
              {generating ? t("candidateInterviewPrep.generating") : t("candidateInterviewPrep.generateCta")}
            </Button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </Card>

      {prep && selected ? (
        <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
          <h2 className="text-lg font-semibold">{t("candidateInterviewPrep.packTitle")}</h2>
          <p className="twin-muted text-sm">
            {selected.title} — {selected.company}
          </p>
          <div className="mt-4 space-y-4 text-sm">
            {prep.questions_to_expect?.length ? (
              <section>
                <h3 className="font-semibold">{t("candidateInterviewPrep.sectionExpect")}</h3>
                <ol className="mt-1 list-decimal pl-5">
                  {prep.questions_to_expect.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </section>
            ) : null}
            {prep.questions_to_ask?.length ? (
              <section>
                <h3 className="font-semibold">{t("candidateInterviewPrep.sectionAsk")}</h3>
                <ul className="mt-1 list-disc pl-5">
                  {prep.questions_to_ask.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {prep.star_stories?.length ? (
              <section>
                <h3 className="font-semibold">{t("candidateInterviewPrep.sectionStar")}</h3>
                <ul className="mt-1 space-y-2">
                  {prep.star_stories.map((s, i) => (
                    <li key={i}>
                      <p className="font-medium">{s.prompt}</p>
                      <p className="twin-muted text-xs">{s.angle}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {prep.day_of_checklist?.length ? (
              <section>
                <h3 className="font-semibold">{t("candidateInterviewPrep.sectionChecklist")}</h3>
                <ul className="mt-1 list-disc pl-5">
                  {prep.day_of_checklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/calendar" className="twin-link text-sm font-medium">
          {t("candidateInterviewPrep.ctaCalendar")}
        </Link>
        <Link href="/dashboard" className="twin-link text-sm font-medium">
          {t("candidateInterviewPrep.backDashboard")}
        </Link>
      </div>

      <p className="twin-muted mt-6 text-xs leading-relaxed">{t("candidateInterviewPrep.scopeNote")}</p>
    </Shell>
  );
}
