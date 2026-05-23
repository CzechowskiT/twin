"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { JobEmployerTabs } from "@/components/job-employer/job-employer-tabs";
import { Card } from "@/components/ui";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

export function JobEmployerModal({
  jobId,
  jobTitle,
  company,
  jobUrl,
  location,
  open,
  initialTab = "overview",
  onClose,
}: {
  jobId: number | null;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  location?: string | null;
  open: boolean;
  initialTab?: JobEmployerTabId;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<JobEmployerTabId>(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  if (!open || !jobId) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employer-hub-title"
    >
      <Card className="flex max-h-[min(92vh,52rem)] w-full max-w-4xl flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--twin-border)] pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
              {t("jobEmployer.openEmployerHub")}
            </p>
            <h2 id="employer-hub-title" className="mt-1 truncate text-xl font-semibold">
              {company}
            </h2>
            <p className="twin-muted truncate text-sm">{jobTitle}</p>
          </div>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1 text-sm"
            onClick={onClose}
            aria-label={t("jobEmployer.close")}
          >
            ×
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <JobEmployerTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            company={company}
            jobId={jobId}
            jobTitle={jobTitle}
            jobUrl={jobUrl}
            location={location}
          />
        </div>
      </Card>
    </div>
  );
}
