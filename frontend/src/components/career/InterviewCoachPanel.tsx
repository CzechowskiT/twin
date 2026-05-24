"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Question = { id: string; text: string; category?: string };

export function InterviewCoachPanel({ jobId }: { jobId: number }) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQ, setActiveQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<{
    score: number;
    strengths: string[];
    improvements: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadQuestions = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ questions: Question[] }>(
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
      const res = await apiFetch<{
        score: number;
        strengths: string[];
        improvements: string[];
      }>(
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
        <div className="text-sm">
          <p className="font-medium">
            {t("strategic.interviewCoachScore")}: {evaluation.score}/100
          </p>
          {evaluation.strengths.map((s) => (
            <p key={s} className="text-[var(--twin-accent)]">
              + {s}
            </p>
          ))}
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
