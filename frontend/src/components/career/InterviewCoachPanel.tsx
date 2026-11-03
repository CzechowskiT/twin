"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Question = { id: string; text: string; category?: string };

type Criterion = {
  id: string;
  outcome: string;
  note?: string;
};

type Evaluation = {
  score: number | null;
  score_available: boolean;
  evaluation_status: string;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  source?: string;
  source_label?: string;
  degraded?: boolean;
  // Legacy field guard — never render if present
  score_of_100_available?: boolean;
};

// Outcome badge colour helper — purely presentational
function outcomeColour(outcome: string): string {
  if (outcome === "SUPPORTED_IN_RESPONSE") return "text-green-700";
  if (outcome === "PARTIALLY_SUPPORTED") return "text-yellow-700";
  if (outcome === "NOT_DEMONSTRATED") return "text-red-700";
  if (outcome === "EVALUATION_UNAVAILABLE") return "text-neutral-400";
  return "twin-muted";
}

export function InterviewCoachPanel({ jobId }: { jobId: number }) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQ, setActiveQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);

  const loadQuestions = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ questions: Question[]; source?: string }>(
        "/api/v1/interview-coach/generate-questions",
        { method: "POST", body: JSON.stringify({ job_id: jobId }) },
        token,
      );
      setQuestions(res.questions || []);
      if (res.questions?.[0]) setActiveQ(res.questions[0].text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("strategic.interviewCoachFailed"));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  const evaluate = useCallback(async () => {
    const token = getToken();
    if (!token || !activeQ) return;
    setLoading(true);
    try {
      const res = await apiFetch<Evaluation>(
        "/api/v1/interview-coach/evaluate-answer",
        {
          method: "POST",
          body: JSON.stringify({ job_id: jobId, question: activeQ, answer }),
        },
        token,
      );
      setEvaluation(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("strategic.interviewCoachFailed"));
    } finally {
      setLoading(false);
    }
  }, [activeQ, answer, jobId, t]);

  // Epic 2.26: never show "score/100" — score_available must be true AND score non-null
  const showScore =
    evaluation?.score_available === true &&
    evaluation.score !== null &&
    typeof evaluation.score === "number";

  const isDegraded =
    evaluation !== null &&
    (evaluation.degraded === true ||
      evaluation.score_available === false ||
      evaluation.evaluation_status === "EVALUATION_UNAVAILABLE");

  return (
    <Card className="space-y-3 p-4">
      <h3 className="font-semibold">{t("strategic.interviewCoachTitle")}</h3>
      <p className="twin-muted text-sm">{t("strategic.interviewCoachBody")}</p>
      <Button className="twin-btn-secondary !w-auto" disabled={loading} onClick={() => void loadQuestions()}>
        {t("strategic.interviewCoachGenerate")}
      </Button>
      {questions.length > 0 ? (
        <select
          className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] p-2 text-sm"
          value={activeQ}
          onChange={(e) => setActiveQ(e.target.value)}
        >
          {questions.map((q) => (
            <option key={q.id} value={q.text}>
              {q.text}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] p-2 text-sm"
        placeholder={t("strategic.interviewCoachAnswerPlaceholder")}
      />
      <Button disabled={loading || !answer.trim()} onClick={() => void evaluate()}>
        {t("strategic.interviewCoachEvaluate")}
      </Button>
      {evaluation ? (
        <div className="text-sm space-y-2">
          {/* Status line — never show score/100 when unavailable */}
          {showScore ? (
            <p className="font-medium">
              {t("strategic.interviewCoachScore")}: {evaluation.score}/100
            </p>
          ) : isDegraded ? (
            <p className="font-medium text-amber-800">
              {t("strategic.interviewCoachUnavailable")}: {evaluation.evaluation_status}
              {evaluation.source_label ? ` · ${evaluation.source_label}` : ""}
            </p>
          ) : (
            <p className="font-medium text-neutral-700">
              {evaluation.evaluation_status}
            </p>
          )}

          {/* Criterion-level outcomes — never a global percentage */}
          {(evaluation.criteria || []).length > 0 ? (
            <div className="space-y-1">
              {evaluation.criteria.map((c) => (
                <p key={c.id} className={outcomeColour(c.outcome)}>
                  <span className="font-medium">{c.id}</span>: {c.outcome}
                  {c.note ? <span className="twin-muted"> — {c.note}</span> : null}
                </p>
              ))}
            </div>
          ) : null}

          {/* Strengths */}
          {evaluation.strengths.map((s) => (
            <p key={s} className="text-[var(--twin-accent)]">
              + {s}
            </p>
          ))}

          {/* Improvements */}
          {evaluation.improvements.map((s) => (
            <p key={s} className="twin-muted">
              → {s}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
