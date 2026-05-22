"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

export function CompanyIntelligenceModal({
  jobId,
  jobTitle,
  company,
  open,
  onClose,
}: {
  jobId: number | null;
  jobTitle: string;
  company: string;
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
      if (res.from_cache) {
        toast.success(t("careerAssistant.intelCached"));
      } else {
        toast.success(t("careerAssistant.intelReady"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("careerAssistant.intelFailed"));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    if (open && jobId) {
      setData(null);
      void load();
    }
  }, [open, jobId, load]);

  if (!open || !jobId) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-intel-title"
    >
      <Card className="max-h-[min(90vh,42rem)] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
              {t("careerAssistant.intelEyebrow")}
            </p>
            <h2 id="company-intel-title" className="mt-1 text-xl font-semibold">
              {company}
            </h2>
            <p className="twin-muted text-sm">{jobTitle}</p>
          </div>
          <button type="button" className="twin-btn-secondary !w-auto px-3 py-1 text-sm" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? <p className="twin-muted mt-6 text-sm">{t("careerAssistant.intelLoading")}</p> : null}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        {data && !loading ? (
          <div className="mt-6 space-y-5">
            <section>
              <h3 className="text-sm font-semibold">{t("careerAssistant.priorities")}</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
                {data.intel.priorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </section>
            <section>
              <h3 className="text-sm font-semibold">{t("careerAssistant.painPoints")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
                {data.intel.pain_points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--twin-accent)]">{t("careerAssistant.useTerms")}</h3>
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
                <h3 className="text-sm font-semibold">{t("careerAssistant.avoidTerms")}</h3>
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
                <h3 className="text-sm font-semibold">{t("careerAssistant.coverLetter")}</h3>
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
      </Card>
    </div>
  );
}
