"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { GlobalJobBriefPanel } from "@/components/career-assistant/global-job-brief-panel";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type Intel = {
  priorities: string[];
  pain_points: string[];
  insider_language: { use: string[]; avoid: string[] };
  cover_letter_draft: string;
};

type ResearchResponse = {
  job_id: number;
  company: string;
  job_title: string;
  intel: Intel;
  from_cache: boolean;
};

function AiIntelBlock({
  data,
  loading,
  error,
  t,
}: {
  data: ResearchResponse | null;
  loading: boolean;
  error: string | null;
  t: (key: TranslationKey) => string;
}) {
  return (
    <details className="group rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface)]">
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
              {t("jobBrief.aiIntelEyebrow")}
            </p>
            <h3 className="text-sm font-semibold">{t("jobBrief.aiIntelTitle")}</h3>
            <p className="twin-muted mt-1 text-xs leading-relaxed">{t("jobBrief.aiIntelLead")}</p>
          </div>
          <span className="twin-muted text-xs transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </div>
      </summary>
      <div className="border-t border-[var(--twin-border)] px-4 py-4">
        {loading ? <p className="twin-muted text-sm">{t("careerAssistant.intelLoading")}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {data && !loading ? (
          <div className="space-y-5">
            <section>
              <h4 className="text-sm font-semibold">{t("careerAssistant.priorities")}</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
                {data.intel.priorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </section>
            <section>
              <h4 className="text-sm font-semibold">{t("careerAssistant.painPoints")}</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
                {data.intel.pain_points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-[var(--twin-accent)]">{t("careerAssistant.useTerms")}</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.intel.insider_language.use.map((term) => (
                    <span
                      key={term}
                      className="rounded-md border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)] px-2 py-0.5 text-xs"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{t("careerAssistant.avoidTerms")}</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.intel.insider_language.avoid.map((term) => (
                    <span
                      key={term}
                      className="rounded-md border border-[var(--twin-border)] px-2 py-0.5 text-xs text-[var(--twin-muted)]"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </section>
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{t("careerAssistant.coverLetter")}</h4>
                <Button
                  type="button"
                  className="!w-auto text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(data.intel.cover_letter_draft);
                    toast.success(t("careerAssistant.copied"));
                  }}
                >
                  {t("careerAssistant.copyLetter")}
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-line rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 text-sm leading-relaxed">
                {data.intel.cover_letter_draft}
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function CompanyIntelligenceModal({
  jobId,
  jobTitle,
  company,
  location,
  open,
  onClose,
}: {
  jobId: number | null;
  jobTitle: string;
  company: string;
  location?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ResearchResponse>(`/api/v1/jobs/${jobId}/research`, { method: "POST" });
      setData(res);
      toast.success(res.from_cache ? t("careerAssistant.intelCached") : t("careerAssistant.intelReady"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerAssistant.intelFailed"));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    if (open && jobId) {
      queueMicrotask(() => {
        setData(null);
        void load();
      });
    }
  }, [open, jobId, load]);

  if (!open || !jobId) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-intel-title"
    >
      <Card className="max-h-[min(95vh,52rem)] w-full max-w-4xl overflow-y-auto p-4 sm:p-6">
        <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-start justify-between gap-3 border-b border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3 sm:-mx-6 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
              {t("careerAssistant.intelEyebrow")}
            </p>
            <h2 id="company-intel-title" className="mt-0.5 text-lg font-semibold sm:text-xl">
              {t("careerAssistant.researchCompanyBrief")}
            </h2>
          </div>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target !w-auto shrink-0 px-3 py-1 text-sm"
            onClick={onClose}
            aria-label={t("jobEmployer.close")}
          >
            ×
          </button>
        </div>

        <GlobalJobBriefPanel company={company} jobTitle={jobTitle} location={location} />

        <div className="mt-6">
          <AiIntelBlock data={data} loading={loading} error={error} t={t} />
        </div>
      </Card>
    </div>
  );
}
