"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Process = {
  id: number;
  title: string;
  company?: string;
  role_title?: string;
  prep_gate?: { state?: string };
  snapshot_immutable?: boolean;
  coverage?: { evidence_linked?: number };
  covert_assistance?: boolean;
};

type Aggregate = {
  processes?: Process[];
  offers?: { id: number; title: string; company: string }[];
  safety?: Record<string, unknown>;
  alembic?: string;
};

/**
 * Epic 2.26: ordinary candidate UI must not auto-write synthetic demo chains.
 * Candidates author process title/company/role; practice lives under /interview-practice.
 */
export default function InterviewDecisionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [active, setActive] = useState<Process | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answerText, setAnswerText] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      const data = await apiFetch<Aggregate>("/api/v1/candidates/me/interview-decision", {}, token);
      setAgg(data);
      if (data.processes?.length) setActive(data.processes[0]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewDecision.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function createProcess() {
    const token = getToken();
    if (!token) return;
    const trimmedTitle = title.trim();
    const trimmedCompany = company.trim();
    if (!trimmedTitle || !trimmedCompany) {
      setErr(t("interviewDecision.createNeedsFields"));
      return;
    }
    setBusy(true);
    setErr(null);
    setStatus("");
    try {
      const created = await apiFetch<{ process: Process }>(
        "/api/v1/candidates/me/interview-decision/processes",
        {
          method: "POST",
          body: JSON.stringify({
            title: trimmedTitle,
            company: trimmedCompany,
            role_title: roleTitle.trim() || trimmedTitle,
          }),
        },
        token,
      );
      setActive(created.process);
      setStatus(t("interviewDecision.processCreated"));
      setTitle("");
      setCompany("");
      setRoleTitle("");
      await load();
    } catch {
      setErr(t("interviewDecision.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    const token = getToken();
    if (!token || !active) return;
    const q = question.trim();
    const a = answerText.trim();
    if (!q || !a) {
      setErr(t("interviewDecision.answerNeedsFields"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const ans = await apiFetch<{ answer: { id: number } }>(
        `/api/v1/candidates/me/interview-decision/processes/${active.id}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            question: q,
            answer_text: a,
            likelihood: "LIKELY",
            evidence_ids: [],
          }),
        },
        token,
      );
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/processes/${active.id}/answers/approve`,
        { method: "POST", body: JSON.stringify({ answer_id: ans.answer.id, approved: true }) },
        token,
      );
      setQuestion("");
      setAnswerText("");
      setStatus(t("interviewDecision.answerSaved"));
      await load();
    } catch {
      setErr(t("interviewDecision.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function runGroundedMock() {
    const token = getToken();
    if (!token || !active) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(
        `/api/v1/candidates/me/interview-decision/processes/${active.id}/mocks`,
        { method: "POST", body: "{}" },
        token,
      );
      setStatus(t("interviewDecision.mockDone"));
      await load();
    } catch {
      setErr(t("interviewDecision.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {t("interviewDecision.eyebrow")}
          </p>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
            {t("interviewDecision.title")}
          </h1>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("interviewDecision.lead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("interviewDecision.title")} />
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <Card className="mb-4" id="create-process">
        <p className="text-xs text-neutral-500">{t("interviewDecision.safetyBanner")}</p>
        <p className="mt-1 text-sm font-medium">
          {t("interviewDecision.noCovert")} · alembic={agg?.alembic || "—"}
        </p>
        <p className="twin-muted mt-2 text-sm">{t("interviewDecision.noSyntheticAutoWrite")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="text-sm">
            <span className="twin-muted block text-xs">{t("interviewDecision.fieldTitle")}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="text-sm">
            <span className="twin-muted block text-xs">{t("interviewDecision.fieldCompany")}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="text-sm">
            <span className="twin-muted block text-xs">{t("interviewDecision.fieldRole")}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              maxLength={200}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void createProcess()}>
            {t("interviewDecision.createProcess")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("interviewDecision.refresh")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy || !active}
            onClick={() => {
              if (active) router.push(`/dashboard/interview-practice?process_id=${active.id}`);
            }}
          >
            {t("interviewDecision.openPractice")}
          </Button>
        </div>
        {status ? <p className="twin-muted mt-2 text-sm">{status}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" id="decisions">
        <Card>
          <h2 className="text-base font-semibold">{t("interviewDecision.processes")}</h2>
          <ul className="mt-2 space-y-2">
            {(agg?.processes || []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded border border-[var(--twin-border)] px-3 py-2 text-left text-sm"
                  onClick={() => setActive(p)}
                >
                  <p className="font-medium">{p.title}</p>
                  <p className="twin-muted text-xs">
                    {p.company || "—"} · {p.prep_gate?.state || "—"} · immutable=
                    {String(p.snapshot_immutable ?? true)}
                  </p>
                </button>
              </li>
            ))}
            {(agg?.processes || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("interviewDecision.empty")}</li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">{t("interviewDecision.active")}</h2>
          {active ? (
            <div className="mt-2 space-y-3 text-sm">
              <p className="font-medium">{active.title}</p>
              <p className="twin-muted text-xs">
                {active.company} · {active.role_title || "—"}
              </p>
              <label className="block">
                <span className="twin-muted text-xs">{t("interviewDecision.fieldQuestion")}</span>
                <input
                  className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <label className="block">
                <span className="twin-muted text-xs">{t("interviewDecision.fieldAnswer")}</span>
                <textarea
                  className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  maxLength={8000}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void submitAnswer()}>
                  {t("interviewDecision.saveAnswer")}
                </Button>
                <Button
                  type="button"
                  className="border border-[var(--twin-border)] bg-transparent"
                  disabled={busy}
                  onClick={() => void runGroundedMock()}
                >
                  {t("interviewDecision.runMock")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="twin-muted mt-2 text-sm">{t("interviewDecision.selectProcess")}</p>
          )}
        </Card>
      </div>
    </Shell>
  );
}
