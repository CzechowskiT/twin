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
  consent_denied?: boolean;
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
  created_at?: string | null;
  updated_at?: string | null;
};

type PrivacyState = {
  ai_prep_opt_in: boolean;
  paused: boolean;
};

function outcomeColour(outcome: string): string {
  if (outcome === "NOT_ASSESSED") return "text-neutral-500";
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
 *
 * AI consent is loaded from canonical privacy row (server-authoritative).
 * The FE checkbox PATCHes privacy; the body ai_prep_opt_in is NOT the authority —
 * the server always reads from the privacy row.
 */
export default function InterviewPracticePage() {
  // Locale from app language provider (NOT navigator.language — avoids SSR mismatch
  // and respects the in-app locale toggle, not the browser default).
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processId = searchParams.get("process_id")
    ? Number(searchParams.get("process_id"))
    : null;

  const sessionIdParam = searchParams.get("session_id")
    ? Number(searchParams.get("session_id"))
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
  const [priorSessions, setPriorSessions] = useState<PracticeSession[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Privacy state — loaded from canonical server row; never derived from request body
  const [privacy, setPrivacy] = useState<PrivacyState>({
    ai_prep_opt_in: false,
    paused: false,
  });
  const [privacyBusy, setPrivacyBusy] = useState(false);

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

  const loadPrivacy = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      // The interview-decision endpoint returns { privacy: { ai_prep_opt_in, paused, ... } }
      const data = await apiFetch<{ privacy?: PrivacyState }>(
        "/api/v1/candidates/me/interview-decision",
        {},
        token,
      );
      if (data?.privacy) {
        setPrivacy({
          ai_prep_opt_in: data.privacy.ai_prep_opt_in ?? false,
          paused: data.privacy.paused ?? false,
        });
      }
    } catch {
      // Non-critical — default remains OFF which is safe
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCatalog();
      void loadPrivacy();
      void loadSessions();
      if (sessionIdParam) void loadSessionById(sessionIdParam);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSessions() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ sessions?: PracticeSession[] }>(
        "/api/v1/candidates/me/interview-practice/sessions?limit=20",
        {},
        token,
      );
      setPriorSessions(data?.sessions ?? []);
    } catch {
      // non-critical
    }
  }

  async function loadSessionById(id: number) {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<PracticeSession>(
        `/api/v1/candidates/me/interview-practice/sessions/${id}`,
        {},
        token,
      );
      setSession(data);
      const activeTurnData = data.turns?.find((t) => t.state !== "SUBMITTED") ?? data.turns?.[data.turns.length - 1] ?? null;
      setActiveTurn(activeTurnData);
      if (activeTurnData?.answer_draft) setAnswerDraft(activeTurnData.answer_draft);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.loadFailed"));
    }
  }

  async function deleteSessionById(id: number) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setDeleteConfirmId(null);
    try {
      await apiFetch(`/api/v1/candidates/me/interview-practice/sessions/${id}`, { method: "DELETE" }, token);
      if (session?.id === id) {
        setSession(null);
        setActiveTurn(null);
        setLastEval(null);
      }
      await loadSessions();
      setStatus(t("interviewPractice.sessionDeleted"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("interviewPractice.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  /** PATCH canonical privacy row — server is always authoritative for AI consent. */
  async function toggleAiConsent() {
    const token = getToken();
    if (!token) return;
    setPrivacyBusy(true);
    try {
      const next = !privacy.ai_prep_opt_in;
      const result = await apiFetch<{ privacy?: PrivacyState }>(
        "/api/v1/candidates/me/interview-decision/privacy",
        {
          method: "PATCH",
          body: JSON.stringify({ ai_prep_opt_in: next }),
        },
        token,
      );
      if (result?.privacy) {
        setPrivacy({
          ai_prep_opt_in: result.privacy.ai_prep_opt_in ?? false,
          paused: result.privacy.paused ?? false,
        });
      }
      setStatus(
        next
          ? t("interviewPractice.aiConsentEnabled")
          : t("interviewPractice.aiConsentDisabled"),
      );
    } catch {
      setErr(t("interviewPractice.actionFailed"));
    } finally {
      setPrivacyBusy(false);
    }
  }

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
            // ai_prep_opt_in is NOT the authority — server reads from canonical privacy row.
            // We send false always; server ignores it and reads DB.
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
      const result = await apiFetch<{ turn: Turn; evaluation: Evaluation | null }>(
        `/api/v1/candidates/me/interview-practice/sessions/${session.id}/turns/${activeTurn.id}/submit`,
        {
          method: "POST",
          // ai_prep_opt_in body value is IGNORED by server — consent read from DB.
          body: JSON.stringify({ answer_text: answerDraft }),
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
        { method: "POST", body: "{}" },
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
  const aiEffective = privacy.ai_prep_opt_in && !privacy.paused;

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

      {/* AI Consent panel — default OFF; user must explicitly opt in */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <input
            id="ai-consent-toggle"
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border border-[var(--twin-border)]"
            checked={privacy.ai_prep_opt_in}
            onChange={() => void toggleAiConsent()}
            disabled={privacyBusy || privacy.paused}
          />
          <div className="flex-1">
            <label htmlFor="ai-consent-toggle" className="cursor-pointer text-sm font-medium">
              {t("interviewPractice.aiConsentLabel")}
            </label>
            <p className="twin-muted mt-0.5 text-xs">
              {privacy.paused
                ? t("interviewPractice.aiConsentPaused")
                : aiEffective
                  ? t("interviewPractice.aiConsentActive")
                  : t("interviewPractice.aiConsentOff")}
            </p>
            <p className="twin-muted mt-1 text-xs">{t("interviewPractice.aiConsentNote")}</p>
          </div>
        </div>
      </Card>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}
      {status ? <p className="twin-muted mb-3 text-sm">{status}</p> : null}

      {/* Prior sessions — discover, resume, or delete */}
      {priorSessions.length > 0 ? (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold">{t("interviewPractice.priorSessions")}</h2>
          <div className="mt-2 space-y-1.5">
            {priorSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded border border-[var(--twin-border)] px-2 py-1.5 text-xs">
                <span className="flex-1 truncate">
                  #{s.id} · {s.exercise_id ?? "—"} · <span className="font-medium">{s.state}</span>
                  {s.created_at ? ` · ${new Date(s.created_at).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB")}` : ""}
                </span>
                {s.state !== "DELETED" && s.state !== "ABANDONED" ? (
                  <button
                    className="rounded border border-[var(--twin-border)] px-2 py-0.5 text-xs hover:bg-neutral-100"
                    onClick={() => { void loadSessionById(s.id); router.replace(`?session_id=${s.id}`, { scroll: false }); }}
                    disabled={busy}
                  >
                    {t("interviewPractice.resumeSession")}
                  </button>
                ) : null}
                {deleteConfirmId === s.id ? (
                  <>
                    <span className="text-red-700">{t("interviewPractice.deleteConfirm")}</span>
                    <button className="rounded bg-red-600 px-2 py-0.5 text-white" onClick={() => void deleteSessionById(s.id)} disabled={busy}>✓</button>
                    <button className="rounded border border-[var(--twin-border)] px-2 py-0.5" onClick={() => setDeleteConfirmId(null)}>✕</button>
                  </>
                ) : (
                  <button
                    className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirmId(s.id)}
                    disabled={busy}
                  >
                    {t("interviewPractice.deleteSession")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
            {lastEval.consent_denied ? ` · ${t("interviewPractice.consentDenied")}` : ""}
          </p>
          {lastEval.consent_denied ? (
            <p className="mt-1 text-xs text-yellow-700">{t("interviewPractice.consentNeeded")}</p>
          ) : null}
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
