"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function ModalShell({
  open,
  title,
  eyebrow,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[min(90vh,42rem)] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--twin-accent)]">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" className="twin-btn-secondary shrink-0 !w-auto px-3 py-1 text-sm" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
}

export function CvOptimizerModal({
  applicationId,
  jobTitle,
  open,
  onClose,
}: {
  applicationId: number | null;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    match_before: number;
    match_after: number;
    optimized_cv_text: string;
    changes: { section: string; change: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!applicationId || !getToken()) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        match_before: number;
        match_after: number;
        optimized_cv_text: string;
        changes: { section: string; change: string }[];
      }>(`/api/v1/applications/${applicationId}/optimize-cv`, { method: "POST" });
      setData(res);
      toast.success(t("careerAssistant.cvReady"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("careerAssistant.cvFailed"));
    } finally {
      setLoading(false);
    }
  }, [applicationId, t]);

  useEffect(() => {
    if (open && applicationId) {
      setData(null);
      void load();
    }
  }, [open, applicationId, load]);

  return (
    <ModalShell
      open={open}
      eyebrow={t("careerAssistant.cvEyebrow")}
      title={`${t("careerAssistant.cvTitle")} — ${jobTitle}`}
      onClose={onClose}
    >
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.cvLoading")}</p> : null}
      {data ? (
        <div className="space-y-4 text-sm">
          <p>
            {t("careerAssistant.matchDelta")}: <strong>{data.match_before}%</strong> →{" "}
            <strong className="text-[var(--twin-accent)]">{data.match_after}%</strong>
          </p>
          {data.changes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {data.changes.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.section}:</span> {c.change}
                </li>
              ))}
            </ul>
          ) : null}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-xs">
            {data.optimized_cv_text.slice(0, 4000)}
          </pre>
          <button
            type="button"
            className="twin-btn-secondary !w-auto px-3 py-1.5 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(data.optimized_cv_text);
              toast.success(t("careerAssistant.copied"));
            }}
          >
            {t("careerAssistant.copyCv")}
          </button>
        </div>
      ) : null}
    </ModalShell>
  );
}

export function HiringInsightsModal({
  jobId,
  jobTitle,
  open,
  onClose,
}: {
  jobId: number | null;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{
    top_traits: string[];
    common_mistakes: string[];
    standout_signals: string[];
    summary: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !jobId || !getToken()) return;
    setLoading(true);
    setInsights(null);
    void apiFetch<{ insights: typeof insights }>(`/api/v1/jobs/${jobId}/hiring-insights`)
      .then((res) => {
        setInsights(res.insights);
        toast.success(t("careerAssistant.insightsReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.insightsFailed")))
      .finally(() => setLoading(false));
  }, [open, jobId, t]);

  return (
    <ModalShell
      open={open}
      eyebrow={t("careerAssistant.insightsEyebrow")}
      title={`${t("careerAssistant.insightsTitle")} — ${jobTitle}`}
      onClose={onClose}
    >
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.insightsLoading")}</p> : null}
      {insights ? (
        <div className="space-y-4 text-sm">
          <p className="twin-muted">{insights.summary}</p>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.topTraits")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.top_traits.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.commonMistakes")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.common_mistakes.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.standoutSignals")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.standout_signals.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        </div>
      ) : null}
    </ModalShell>
  );
}

export function SalaryNegotiateModal({
  applicationId,
  jobTitle,
  open,
  onClose,
}: {
  applicationId: number | null;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ email_subject: string; email_body: string; recommended_ask_pln_monthly: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open || !applicationId || !getToken()) return;
    setLoading(true);
    void apiFetch<typeof data>(`/api/v1/offers/${applicationId}/negotiate`, { method: "POST" })
      .then((res) => {
        setData(res);
        toast.success(t("careerAssistant.negotiateReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.negotiateFailed")))
      .finally(() => setLoading(false));
  }, [open, applicationId, t]);

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.negotiateEyebrow")} title={jobTitle} onClose={onClose}>
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.negotiateLoading")}</p> : null}
      {data ? (
        <div className="space-y-3 text-sm">
          <p>
            {t("careerAssistant.recommendedAsk")}:{" "}
            <strong>{data.recommended_ask_pln_monthly?.toLocaleString()} PLN/mo</strong>
          </p>
          <p className="font-medium">{data.email_subject}</p>
          <pre className="whitespace-pre-wrap rounded-lg border border-[var(--twin-border)] p-3 text-xs">{data.email_body}</pre>
          <button
            type="button"
            className="twin-btn-secondary !w-auto px-3 py-1.5 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(`${data.email_subject}\n\n${data.email_body}`);
              toast.success(t("careerAssistant.copied"));
            }}
          >
            {t("careerAssistant.copyLetter")}
          </button>
        </div>
      ) : null}
    </ModalShell>
  );
}

export function InterviewPrepModal({
  interviewId,
  title,
  open,
  onClose,
}: {
  interviewId: number | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<{ question: string; star_answer: string }[]>([]);

  useEffect(() => {
    if (!open || !interviewId || !getToken()) return;
    setLoading(true);
    void apiFetch<{ questions: { question: string; star_answer: string }[] }>(`/api/v1/interviews/${interviewId}/prep`)
      .then((res) => {
        setQuestions(res.questions || []);
        toast.success(t("careerAssistant.prepReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.prepFailed")))
      .finally(() => setLoading(false));
  }, [open, interviewId, t]);

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.prepEyebrow")} title={title} onClose={onClose}>
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.prepLoading")}</p> : null}
      <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="font-medium">{q.question}</p>
            <p className="twin-muted mt-1 text-xs">{q.star_answer}</p>
          </li>
        ))}
      </ol>
    </ModalShell>
  );
}

export function FollowUpModal({
  interviewId,
  title,
  open,
  onClose,
}: {
  interviewId: number | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);

  const generate = () => {
    if (!interviewId || !getToken()) return;
    setLoading(true);
    void apiFetch<{ subject: string; body: string }>(`/api/v1/interviews/${interviewId}/follow-up`, {
      method: "POST",
      body: JSON.stringify({ notes: notes.trim() || null }),
    })
      .then((res) => {
        setEmail(res);
        toast.success(t("careerAssistant.followUpReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.followUpFailed")))
      .finally(() => setLoading(false));
  };

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.followUpEyebrow")} title={title} onClose={onClose}>
      <label className="block text-sm">
        <span className="twin-muted">{t("careerAssistant.followUpNotes")}</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent p-2 text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button type="button" className="twin-btn-solid mt-3 !w-auto px-3 py-1.5 text-xs" disabled={loading} onClick={generate}>
        {loading ? t("careerAssistant.followUpLoading") : t("careerAssistant.followUpGenerate")}
      </button>
      {email ? (
        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium">{email.subject}</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-3 text-xs">{email.body}</pre>
          <button
            type="button"
            className="twin-btn-secondary !w-auto px-3 py-1.5 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
              toast.success(t("careerAssistant.copied"));
            }}
          >
            {t("careerAssistant.copyLetter")}
          </button>
        </div>
      ) : null}
    </ModalShell>
  );
}

export function LinkedinOptimizerModal({
  open,
  onClose,
  defaultRole,
}: {
  open: boolean;
  onClose: () => void;
  defaultRole: string;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ headline: string; about: string; featured_skills: string[] } | null>(null);

  useEffect(() => {
    if (open) setRole(defaultRole);
  }, [open, defaultRole]);

  const run = () => {
    if (!getToken() || !role.trim()) return;
    setLoading(true);
    void apiFetch<{ headline: string; about: string; featured_skills: string[] }>(
      "/api/v1/candidates/me/optimize-linkedin",
      { method: "POST", body: JSON.stringify({ target_role: role.trim() }) },
    )
      .then((res) => {
        setResult(res);
        toast.success(t("careerAssistant.linkedinReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.linkedinFailed")))
      .finally(() => setLoading(false));
  };

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.linkedinEyebrow")} title={t("careerAssistant.linkedinTitle")} onClose={onClose}>
      <label className="block text-sm">
        <span className="twin-muted">{t("careerAssistant.targetRole")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent p-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </label>
      <button type="button" className="twin-btn-solid mt-3 !w-auto px-3 py-1.5 text-xs" disabled={loading} onClick={run}>
        {loading ? t("careerAssistant.linkedinLoading") : t("careerAssistant.linkedinRun")}
      </button>
      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="font-semibold">{t("careerAssistant.linkedinHeadline")}:</span> {result.headline}
          </p>
          <p className="whitespace-pre-wrap">{result.about}</p>
          <p>{result.featured_skills.join(" · ")}</p>
        </div>
      ) : null}
    </ModalShell>
  );
}
