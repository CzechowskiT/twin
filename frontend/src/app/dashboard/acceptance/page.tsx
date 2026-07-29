"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AcceptanceCalendarPanel } from "@/components/career/acceptance-calendar-panel";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type InterviewItem = {
  kind: "interview";
  id: number;
  company_name: string;
  job_title: string;
  interview_start: string | null;
  interview_end: string | null;
  meeting_link: string | null;
  status: string;
};

type MatchItem = {
  kind: "match";
  job_id: number;
  title: string;
  company: string;
  score: number;
  url: string;
};

type QueueOut = { interviews: InterviewItem[]; matches: MatchItem[]; total: number };

export default function AcceptanceQueuePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueOut | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<QueueOut>("/api/v1/candidates/me/acceptance-queue", {}, token);
      setQueue(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setQueue(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function respond(kind: string, id: number, action: "accept" | "decline") {
    const token = getToken();
    if (!token) return;
    const key = `${kind}-${id}-${action}`;
    setBusyId(key);
    try {
      await apiFetch(
        `/api/v1/candidates/me/acceptance-queue/${id}/respond`,
        { method: "POST", body: JSON.stringify({ kind, action }) },
        token,
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const listItems: React.ReactNode[] = [];
  if (queue) {
    for (const i of queue.interviews) {
      const start = i.interview_start ? new Date(i.interview_start) : null;
      listItems.push(
          <li key={`i-${i.id}`} className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--twin-accent)]">
              {t("acceptanceQueue.interviewBadge")}
            </p>
            <p className="mt-1 font-semibold">
              {i.job_title} · {i.company_name}
            </p>
            {start && !Number.isNaN(start.getTime()) ? (
              <p className="twin-muted mt-1 text-xs">{start.toLocaleString(locale)}</p>
            ) : null}
            {i.meeting_link?.trim() ? (
              <a href={i.meeting_link.trim()} target="_blank" rel="noopener noreferrer" className="twin-link mt-2 inline-block text-xs">
                {t("dashboard.calendarNextInterviewJoinLink")}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="!w-auto text-xs" disabled={busyId !== null} onClick={() => void respond("interview", i.id, "accept")}>
                {busyId === `interview-${i.id}-accept` ? "…" : t("acceptanceQueue.keep")}
              </Button>
              <button type="button" className="twin-btn-ghost text-xs" disabled={busyId !== null} onClick={() => void respond("interview", i.id, "decline")}>
                {busyId === `interview-${i.id}-decline` ? "…" : t("acceptanceQueue.cancelInterview")}
              </button>
            </div>
          </li>,
      );
    }
    for (const m of queue.matches) {
      listItems.push(
          <li key={`m-${m.job_id}`} className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {t("acceptanceQueue.matchBadge")} · {Math.round(m.score)}%
            </p>
            <p className="mt-1 font-semibold">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="twin-link">
                {m.title}
              </a>{" "}
              · {m.company}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="!w-auto text-xs" disabled={busyId !== null} onClick={() => void respond("match", m.job_id, "accept")}>
                {busyId === `match-${m.job_id}-accept` ? "…" : t("acceptanceQueue.save")}
              </Button>
              <button type="button" className="twin-btn-ghost text-xs" disabled={busyId !== null} onClick={() => void respond("match", m.job_id, "decline")}>
                {busyId === `match-${m.job_id}-decline` ? "…" : t("acceptanceQueue.decline")}
              </button>
            </div>
          </li>,
      );
    }
  }

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("acceptanceCalendar.title")}</h1>
        <CandidateWorkspaceSubnav ariaLabel={t("acceptanceCalendar.title")} />
      </div>
      <div className="mb-6">
        <AcceptanceCalendarPanel />
      </div>
      <Card>
        <h2 className="mb-2 text-base font-semibold">{t("acceptanceQueue.title")}</h2>
        <p className="twin-muted mb-4 text-sm leading-relaxed">{t("acceptanceQueue.lead")}</p>
        {loading ? <p className="twin-muted text-sm">{t("acceptanceQueue.loading")}</p> : null}
        {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
        {!loading && queue && queue.total === 0 ? (
          <div
            className="rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 px-4 py-5"
            role="status"
          >
            <p className="font-semibold text-[var(--foreground)]">{t("acceptanceQueue.emptyTitle")}</p>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("acceptanceQueue.emptyHint")}</p>
            <p className="twin-muted mt-2 text-xs leading-relaxed">{t("acceptanceQueue.empty")}</p>
            <Link href="/dashboard#dashboard-matches" className="twin-link mt-4 inline-block text-sm font-medium">
              {t("acceptanceQueue.emptyCta")} →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">{listItems}</ul>
        )}
        <Link href="/dashboard" className="twin-link mt-8 inline-block text-sm">
          {t("acceptanceQueue.back")}
        </Link>
      </Card>
    </Shell>
  );
}
