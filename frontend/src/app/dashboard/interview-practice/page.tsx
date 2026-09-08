"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Exercise = {
  id: string;
  family: string;
  difficulty: string;
  title: string;
  prompt: string;
};

type Catalog = {
  exercises?: Exercise[];
};

type Criterion = {
  id: string;
  outcome: string;
  note?: string;
};

type Evaluation = {
  id?: number;
  evaluation_status: string;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  source_label?: string;
  degraded?: boolean;
  score: null;
  score_available: false;
};

type Turn = {
  id: number;
  turn_index: number;
  state: string;
  question_text: string;
  answer_draft: string;
  answer_submitted?: string | null;
  submitted_at?: string | null;
};

type PracticeSession = {
  id: number;
  exercise_id?: string | null;
  state: string;
  turns: Turn[];
  evaluations: Record<string, Evaluation>;
  score: null;
  score_available: false;
};

function outcomeColour(outcome: string): string {
  if (outcome === "SUPPORTED_IN_RESPONSE") return "text-green-700";
  if (outcome === "PARTIALLY_SUPPORTED") return "text-yellow-700";
  if (outcome === "NOT_DEMONSTRATED") return "text-red-700";
  if (outcome === "EVALUATION_UNAVAILABLE") return "text-neutral-400";
  return "twin-muted";
}

/**
 * Epic 2.26 adaptive practice panel.
 * Secondary surface — NOT a primary nav item.
 * Linked from /dashboard/interview-decision via "Open adaptive practice" button.
 */
export default function InterviewPracticePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processId = searchParams.get("process_id")
    ? Number(searchParams.get("process_id"))
    : null;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [activeTurn, setActiveTurn] = useState<Turn | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Locale for catalog fetching
  const locale =
    typeof navigator !== "undefined" && navigator.language.startsWith("pl") ? "pl" : "en";

  const loadCatalog = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Catalog>(
        `/api/v1/candidates/me/interview-practice/catalog?locale=${locale}`,
        {},
        token,
      );
      setCatalog(data);
      if (data.exercises?.[0] && !selectedExercise) {
        setSelectedExercise(data.exercises[0].id);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.loadFailed"));
    }
  }, [router, t, locale, selectedExercise]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCatalog();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSession(null);
    setActiveTurn(null);
    setLastEval(null);
    setAnswerDraft("");
    try {
      const data = await apiFetch<PracticeSession>(
        "/api/v1/candidates/me/interview-practice/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            exercise_id: selectedExercise || null,
            process_id: processId,
            locale,
            ai_prep_opt_in: false,
          }),
        },
        token,
      );
      setSession(data);
      const firstTurn = data.turns?.[0] ?? null;
      setActiveTurn(firstTurn);
      setStatus(t("interviewPractice.sessionStarted"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const token = getToken();
    if (!token || !session || !activeTurn) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/turns/${activeTurn.id}/draft`,
        { method: "PATCH", body: JSON.stringify({ answer_draft: answerDraft }) },
        token,
      );
      setStatus(t("interviewPractice.draftSaved"));
    } catch {
      setErr(t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    const token = getToken();
    if (!token || !session || !activeTurn || !answerDraft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await apiFetch<{ turn: Turn; evaluation: Evaluation }>(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/turns/${activeTurn.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answer_text: answerDraft, ai_prep_opt_in: false }),
        },
        token,
      );
      setLastEval(result.evaluation);
      setActiveTurn({ ...activeTurn, state: "SUBMITTED", answer_submitted: answerDraft });
      setStatus(t("interviewPractice.answerSubmitted"));
      // Refresh session
      const updated = await apiFetch<PracticeSession>(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}`,
        {},
        token,
      );
      setSession(updated);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function nextTurn() {
    const token = getToken();
    if (!token || !session) return;
    setBusy(true);
    setErr(null);
    setLastEval(null);
    setAnswerDraft("");
    try {
      const result = await apiFetch<{ turn: Turn }>(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/next-turn`,
        { method: "POST", body: JSON.stringify({ ai_prep_opt_in: false }) },
        token,
      );
      setActiveTurn(result.turn);
      setStatus(t("interviewPractice.nextTurnReady"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function completeSession() {
    const token = getToken();
    if (!token || !session) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/complete`,
        { method: "POST", body: "{}" },
        token,
      );
      setStatus(t("interviewPractice.sessionCompleted"));
      setSession((s) => (s ? { ...s, state: "COMPLETED" } : s));
    } catch {
      setErr(t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function promoteToEvidence() {
    const token = getToken();
    if (!token || !session) return;
    setBusy(true);
    setErr(null);
    try {
      const promo = await apiFetch<{ label?: string; evidence_ids?: number[] }>(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/promote-to-evidence`,
        { method: "POST", body: "{}" },
        token,
      );
      setStatus(
        `${t("interviewPractice.promoted")} (${promo.label || "PRACTICE_WORK_SAMPLE"} · ${promo.evidence_ids?.length ?? 0})`,
      );
    } catch {
      setErr(t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const selectedExerciseObj = catalog?.exercises?.find((e) => e.id === selectedExercise);
  const isSessionActive = session && !["COMPLETED", "ABANDONED", "DELETED"].includes(session.state);
  const canSubmit = !!activeTurn && activeTurn.state !== "SUBMITTED" && answerDraft.trim().length > 0;
  const canNext = !!activeTurn && activeTurn.state === "SUBMITTED";

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {t("interviewPractice.eyebrow")}
          </p>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
            {t("interviewPractice.title")}
          </h1>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("interviewPractice.lead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("interviewPractice.title")} />
      </div>

      <p className="twin-muted mb-3 text-xs">{t("interviewPractice.safetyNote")}</p>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}
      {status ? <p className="twin-muted mb-3 text-sm">{status}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: catalog picker + start */}
        <Card>
          <h2 className="text-base font-semibold">{t("interviewPractice.catalog")}</h2>
          {catalog?.exercises?.length ? (
            <div className="mt-3 space-y-2">
              <select
                className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5 text-sm"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                disabled={busy || isSessionActive === true}
              >
                {catalog.exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} [{ex.family} · {ex.difficulty}]
                  </option>
                ))}
              </select>
              {selectedExerciseObj ? (
                <p className="twin-muted text-xs leading-relaxed">
                  {selectedExerciseObj.prompt}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="twin-muted mt-2 text-sm">{t("interviewPractice.catalogEmpty")}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!isSessionActive ? (
              <Button type="button" disabled={busy || !selectedExercise} onClick={() => void startSession()}>
                {t("interviewPractice.startSession")}
              </Button>
            ) : (
              <Button
                type="button"
                className="border border-[var(--twin-border)] bg-transparent"
                disabled={busy}
                onClick={() => void completeSession()}
              >
                {t("interviewPractice.completeSession")}
              </Button>
            )}
            {session?.state === "COMPLETED" ? (
              <Button
                type="button"
                className="border border-[var(--twin-border)] bg-transparent"
                disabled={busy}
                onClick={() => void promoteToEvidence()}
              >
                {t("interviewPractice.promoteEvidence")}
              </Button>
            ) : null}
            <Button
              type="button"
              className="border border-[var(--twin-border)] bg-transparent"
              onClick={() => router.push("/dashboard/interview-decision")}
            >
              {t("interviewPractice.backToDecision")}
            </Button>
          </div>
          <p className="twin-muted mt-2 text-xs">{t("interviewPractice.promoteNote")}</p>
        </Card>

        {/* Right: active turn */}
        <Card>
          <h2 className="text-base font-semibold">{t("interviewPractice.activeTurn")}</h2>
          {activeTurn ? (
            <div className="mt-2 space-y-3 text-sm">
              <p className="text-xs text-neutral-500">
                {t("interviewPractice.turn")} #{activeTurn.turn_index + 1} · {activeTurn.state}
              </p>
              <p className="font-medium leading-relaxed">{activeTurn.question_text}</p>

              {activeTurn.state !== "SUBMITTED" ? (
                <>
                  <label className="block">
                    <span className="twin-muted text-xs">{t("interviewPractice.yourAnswer")}</span>
                    <textarea
                      className="mt-1 w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1.5"
                      rows={5}
                      value={answerDraft}
                      onChange={(e) => setAnswerDraft(e.target.value)}
                      maxLength={8000}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={busy} onClick={() => void saveDraft()}>
                      {t("interviewPractice.saveDraft")}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || !canSubmit}
                      onClick={() => void submitAnswer()}
                    >
                      {t("interviewPractice.submitAnswer")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="twin-muted text-xs">{t("interviewPractice.answerLocked")}</p>
                  <p className="rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-2 text-xs leading-relaxed">
                    {activeTurn.answer_submitted}
                  </p>
                  {canNext && isSessionActive ? (
                    <Button type="button" disabled={busy} onClick={() => void nextTurn()}>
                      {t("interviewPractice.nextTurn")}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : session ? (
            <p className="twin-muted mt-2 text-sm">{t("interviewPractice.sessionIdle")}</p>
          ) : (
            <p className="twin-muted mt-2 text-sm">{t("interviewPractice.noSession")}</p>
          )}
        </Card>
      </div>

      {/* Evaluation panel — never shows score/100 */}
      {lastEval ? (
        <Card className="mt-4">
          <h2 className="text-base font-semibold">{t("interviewPractice.evalTitle")}</h2>
          <p className="twin-muted text-xs">
            {lastEval.evaluation_status}
            {lastEval.source_label ? ` · ${lastEval.source_label}` : ""}
            {lastEval.degraded ? ` · ${t("interviewPractice.degraded")}` : ""}
          </p>
          {/* Criterion-level outcomes only — no global score/100 */}
          <div className="mt-2 space-y-1">
            {(lastEval.criteria || []).map((c) => (
              <p key={c.id} className={`text-sm ${outcomeColour(c.outcome)}`}>
                <span className="font-medium">{c.id}</span>: {c.outcome}
                {c.note ? <span className="twin-muted"> — {c.note}</span> : null}
              </p>
            ))}
          </div>
          {lastEval.strengths.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-green-700">
                {t("interviewPractice.strengths")}
              </p>
              {lastEval.strengths.map((s) => (
                <p key={s} className="text-sm text-green-700">
                  + {s}
                </p>
              ))}
            </div>
          ) : null}
          {lastEval.improvements.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-medium text-neutral-500">
                {t("interviewPractice.improvements")}
              </p>
              {lastEval.improvements.map((s) => (
                <p key={s} className="twin-muted text-sm">
                  → {s}
                </p>
              ))}
            </div>
          ) : null}
          <p className="twin-muted mt-2 text-xs">{t("interviewPractice.noScoreClaim")}</p>
        </Card>
      ) : null}
    </Shell>
  );
}
