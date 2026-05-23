"use client";

import { useTranslation } from "@/components/language-provider";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";
import type { JOB_EMPLOYER_MESSAGES_EN } from "@/lib/job-employer-messages";

const TAB_LABEL_KEYS: Record<JobEmployerTabId, keyof typeof JOB_EMPLOYER_MESSAGES_EN> = {
  overview: "tabOverview",
  about: "tabAbout",
  howItWorks: "tabHowItWorks",
  roles: "tabRoles",
  media: "tabMedia",
  partners: "tabPartners",
  contact: "tabContact",
  faq: "tabFaq",
  caseStudies: "tabCaseStudies",
  pricing: "tabPricing",
};

export function JobEmployerTabPlaceholder({ tabId }: { tabId: JobEmployerTabId }) {
  const { t } = useTranslation();
  const labelKey = TAB_LABEL_KEYS[tabId];

  return (
    <div className="rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-[var(--foreground)]">{t(`jobEmployer.${labelKey}`)}</p>
      <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t("jobEmployer.tabPlaceholderLead")}</p>
    </div>
  );
}
