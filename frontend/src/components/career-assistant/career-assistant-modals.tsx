"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
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
          <button type="button" className="twin-btn-secondary !w-auto shrink-0 px-3 py-1 text-sm" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
}

type CvChange = { section: string; before: string; after: string; reason: string };

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
    changes: CvChange[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!applicationId || !getToken()) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        match_before: number;
        match_after: number;
        optimized_cv_text: string;
        changes: CvChange[];
      }>(`/api/v1/career-assistant/applications/${applicationId}/ats-cv`, { method: "POST" });
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
            <ul className="list-disc space-y-2 pl-5">
              {data.changes.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.section}</span>
                  <p className="twin-muted text-xs">{c.reason}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-xs">
            {data.optimized_cv_text.slice(0, 4000)}
          </pre>
          <Button
            type="button"
            className="!w-auto"
            onClick={() => {
              void navigator.clipboard.writeText(data.optimized_cv_text);
              toast.success(t("careerAssistant.copied"));
            }}
          >
            {t("careerAssistant.copyCv")}
          </Button>
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
    red_flags: string[];
    interview_focus: string[];
    bar_summary: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !jobId || !getToken()) return;
    setLoading(true);
    setInsights(null);
    void apiFetch<{
      insights: {
        top_traits: string[];
        red_flags: string[];
        interview_focus: string[];
        bar_summary: string;
      };
      from_cache: boolean;
    }>(`/api/v1/career-assistant/jobs/${jobId}/hiring-insights`, { method: "POST" })
      .then((res) => {
        setInsights(res.insights);
        toast.success(
          res.from_cache ? t("careerAssistant.intelCached") : t("careerAssistant.insightsReady"),
        );
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
          <p className="twin-muted">{insights.bar_summary}</p>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.topTraits")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.top_traits.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.commonMistakes")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.red_flags.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section>
            <h3 className="font-semibold">{t("careerAssistant.standoutSignals")}</h3>
            <ul className="mt-1 list-disc pl-5">{insights.interview_focus.map((x, i) => <li key={i}>{x}</li>)}</ul>
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
  const [data, setData] = useState<{
    market_range_pln_monthly?: { low: number; mid: number; high: number };
    talking_points?: string[];
    counter_email?: { subject: string; body: string };
  } | null>(null);

  useEffect(() => {
    if (!open || !applicationId || !getToken()) return;
    setLoading(true);
    void apiFetch<{ negotiation: typeof data }>(
      `/api/v1/career-assistant/applications/${applicationId}/salary-negotiation`,
      { method: "POST", body: "{}" },
    )
      .then((res) => {
        setData(res.negotiation);
        toast.success(t("careerAssistant.negotiateReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.negotiateFailed")))
      .finally(() => setLoading(false));
  }, [open, applicationId, t]);

  const range = data?.market_range_pln_monthly;
  const email = data?.counter_email;

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.negotiateEyebrow")} title={jobTitle} onClose={onClose}>
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.negotiateLoading")}</p> : null}
      {data ? (
        <div className="space-y-3 text-sm">
          {range ? (
            <p>
              {t("careerAssistant.recommendedAsk")}:{" "}
              <strong>
                {range.low.toLocaleString()}–{range.high.toLocaleString()} PLN/mo
              </strong>{" "}
              (mid {range.mid.toLocaleString()})
            </p>
          ) : null}
          {data.talking_points?.length ? (
            <ul className="list-disc pl-5">
              {data.talking_points.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          ) : null}
          {email ? (
            <>
              <p className="font-medium">{email.subject}</p>
              <pre className="whitespace-pre-wrap rounded-lg border border-[var(--twin-border)] p-3 text-xs">
                {email.body}
              </pre>
              <Button
                type="button"
                className="!w-auto"
                onClick={() => {
                  void navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
                  toast.success(t("careerAssistant.copied"));
                }}
              >
                {t("careerAssistant.copyLetter")}
              </Button>
            </>
          ) : null}
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
  const [prep, setPrep] = useState<{
    questions_to_expect?: string[];
    questions_to_ask?: string[];
    star_stories?: { prompt: string; angle: string }[];
    day_of_checklist?: string[];
  } | null>(null);

  useEffect(() => {
    if (!open || !interviewId || !getToken()) return;
    setLoading(true);
    void apiFetch<{ prep: typeof prep }>("/api/v1/career-assistant/interview-prep", {
      method: "POST",
      body: JSON.stringify({ scheduled_interview_id: interviewId }),
    })
      .then((res) => {
        setPrep(res.prep);
        toast.success(t("careerAssistant.prepReady"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("careerAssistant.prepFailed")))
      .finally(() => setLoading(false));
  }, [open, interviewId, t]);

  return (
    <ModalShell open={open} eyebrow={t("careerAssistant.prepEyebrow")} title={title} onClose={onClose}>
      {loading ? <p className="twin-muted text-sm">{t("careerAssistant.prepLoading")}</p> : null}
      {prep ? (
        <div className="space-y-4 text-sm">
          {prep.questions_to_expect?.length ? (
            <section>
              <h3 className="font-semibold">{t("careerAssistant.prepExpect")}</h3>
              <ol className="mt-1 list-decimal pl-5">
                {prep.questions_to_expect.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </section>
          ) : null}
          {prep.star_stories?.length ? (
            <section>
              <h3 className="font-semibold">{t("careerAssistant.prepStar")}</h3>
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
          {prep.questions_to_ask?.length ? (
            <section>
              <h3 className="font-semibold">{t("careerAssistant.prepAsk")}</h3>
              <ul className="mt-1 list-disc pl-5">
                {prep.questions_to_ask.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
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
    void apiFetch<{ email: { subject: string; body: string } }>(
      `/api/v1/career-assistant/interviews/${interviewId}/follow-up`,
      {
        method: "POST",
        body: JSON.stringify({ notes: notes.trim() }),
      },
    )
      .then((res) => {
        setEmail(res.email);
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
      <Button type="button" className="mt-3" disabled={loading} onClick={generate}>
        {loading ? t("careerAssistant.followUpLoading") : t("careerAssistant.followUpGenerate")}
      </Button>
      {email ? (
        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium">{email.subject}</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-3 text-xs">{email.body}</pre>
              <button
                type="button"
                className="twin-btn-secondary twin-touch-target !w-auto"
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
  const [result, setResult] = useState<{
    headline: string;
    about: string;
    featured_skills: string[];
    profile_tips?: string[];
  } | null>(null);

  useEffect(() => {
    if (open) setRole(defaultRole);
  }, [open, defaultRole]);

  const run = () => {
    if (!getToken() || !role.trim()) return;
    setLoading(true);
    void apiFetch<{ optimization: typeof result }>("/api/v1/career-assistant/me/linkedin-optimize", {
      method: "POST",
      body: JSON.stringify({ target_role: role.trim() }),
    })
      .then((res) => {
        setResult(res.optimization);
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
      <Button type="button" className="mt-3" disabled={loading} onClick={run}>
        {loading ? t("careerAssistant.linkedinLoading") : t("careerAssistant.linkedinRun")}
      </Button>
      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="font-semibold">{t("careerAssistant.linkedinHeadline")}:</span> {result.headline}
          </p>
          <p className="whitespace-pre-wrap">{result.about}</p>
          <p>{result.featured_skills?.join(" · ")}</p>
        </div>
      ) : null}
    </ModalShell>
  );
}
