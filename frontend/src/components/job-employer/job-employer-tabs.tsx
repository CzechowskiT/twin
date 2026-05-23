"use client";

import { useTranslation } from "@/components/language-provider";
import { JobEmployerContactTab } from "@/components/job-employer/job-employer-contact-tab";
import { JobEmployerFaqTab } from "@/components/job-employer/job-employer-faq-tab";
import { JobEmployerMediaTab } from "@/components/job-employer/tabs/media-tab";
import { JobEmployerCaseStudiesTab } from "@/components/job-employer/tabs/job-employer-case-studies-tab";
import { JobEmployerOverviewTab } from "@/components/job-employer/tabs/overview-tab";
import { JobEmployerPartnersTab } from "@/components/job-employer/tabs/partners-tab";
import { JobEmployerPricingTab } from "@/components/job-employer/tabs/pricing-tab";
import { JobEmployerHowItWorksTab } from "@/components/job-employer/tabs/how-it-works-tab";
import { JobEmployerRolesTab } from "@/components/job-employer/tabs/roles-tab";
import { JOB_EMPLOYER_TAB_ORDER, type JobEmployerTabId } from "@/lib/job-employer-demo";
import type { JOB_EMPLOYER_MESSAGES_EN } from "@/lib/job-employer-messages";

const TAB_LABEL_KEYS: Record<JobEmployerTabId, keyof typeof JOB_EMPLOYER_MESSAGES_EN> = {
  overview: "tabOverview",
  howItWorks: "tabHowItWorks",
  media: "tabMedia",
  partners: "tabPartners",
  roles: "tabRoles",
  contact: "tabContact",
  faq: "tabFaq",
  caseStudies: "tabCaseStudies",
  pricing: "tabPricing",
};

export type JobEmployerTabsProps = {
  activeTab: JobEmployerTabId;
  onTabChange: (tab: JobEmployerTabId) => void;
  company: string;
  jobId: number;
  jobTitle: string;
  jobUrl?: string;
  location?: string | null;
};

export function JobEmployerTabs({
  activeTab,
  onTabChange,
  company,
  jobId,
  jobTitle,
  jobUrl,
  location,
}: JobEmployerTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <p className="rounded-lg border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/25 px-3 py-2 text-xs text-[var(--twin-muted-strong)]">
        {t("jobEmployer.demoDisclaimer")}
      </p>
      <div
        className="flex gap-1 overflow-x-auto border-b border-[var(--twin-border)] pb-px [-webkit-overflow-scrolling:touch]"
        role="tablist"
        aria-label={company}
      >
        {JOB_EMPLOYER_TAB_ORDER.map((tabId) => {
          const selected = tabId === activeTab;
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`employer-tab-${tabId}`}
              aria-controls={`employer-panel-${tabId}`}
              onClick={() => onTabChange(tabId)}
              className={`twin-touch-target shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                selected
                  ? "border-b-2 border-[var(--twin-accent)] text-[var(--foreground)]"
                  : "text-[var(--twin-muted)] hover:text-[var(--twin-muted-strong)]"
              }`}
            >
              {t(`jobEmployer.${TAB_LABEL_KEYS[tabId]}`)}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`employer-panel-${activeTab}`}
        aria-labelledby={`employer-tab-${activeTab}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {activeTab === "contact" ? (
          <JobEmployerContactTab company={company} jobId={jobId} jobTitle={jobTitle} jobUrl={jobUrl} />
        ) : null}
        {activeTab === "howItWorks" ? (
          <JobEmployerHowItWorksTab company={company} jobTitle={jobTitle} jobUrl={jobUrl} />
        ) : null}
        {activeTab === "partners" ? <JobEmployerPartnersTab company={company} /> : null}
        {activeTab === "media" ? <JobEmployerMediaTab /> : null}
        {activeTab === "overview" ? (
          <JobEmployerOverviewTab company={company} jobTitle={jobTitle} location={location} />
        ) : null}
        {activeTab === "roles" ? (
          <JobEmployerRolesTab company={company} jobTitle={jobTitle} location={location} />
        ) : null}
        {activeTab === "faq" ? (
          <JobEmployerFaqTab
            company={company}
            jobTitle={jobTitle}
            onGoToContact={() => onTabChange("contact")}
          />
        ) : null}
        {activeTab === "caseStudies" ? <JobEmployerCaseStudiesTab company={company} /> : null}
        {activeTab === "pricing" ? (
          <JobEmployerPricingTab company={company} jobTitle={jobTitle} />
        ) : null}
      </div>
    </div>
  );
}
