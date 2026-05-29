"use client";

import { CompanyIntelligenceModal } from "@/components/career-assistant/company-intelligence-modal";
import {
  CvOptimizerModal,
  HiringInsightsModal,
  LinkedinOptimizerModal,
  SalaryNegotiateModal,
} from "@/components/career-assistant/career-assistant-modals";
import { JobEmployerModal } from "@/components/job-employer/job-employer-modal";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

type IntelJob = { id: number; title: string; company: string; location: string | null } | null;
type InsightsJob = { id: number; title: string } | null;
type EmployerJob =
  | {
      id: number;
      title: string;
      company: string;
      location: string | null;
      url?: string;
      initialTab?: JobEmployerTabId;
    }
  | null;
type AppRef = { id: number; title: string } | null;

type Props = {
  intelJob: IntelJob;
  onCloseIntel: () => void;
  insightsJob: InsightsJob;
  onCloseInsights: () => void;
  employerHubJob: EmployerJob;
  onCloseEmployerHub: () => void;
  cvApp: AppRef;
  onCloseCv: () => void;
  negotiateApp: AppRef;
  onCloseNegotiate: () => void;
  linkedinOpen: boolean;
  onCloseLinkedin: () => void;
  linkedinDefaultRole: string;
};

/**
 * Bundles the dashboard's tail of career-assistant + employer-hub modals.
 * They are open/closed via state living in the parent page; this component
 * is pure plumbing to keep page.tsx readable.
 */
export function DashboardModals({
  intelJob,
  onCloseIntel,
  insightsJob,
  onCloseInsights,
  employerHubJob,
  onCloseEmployerHub,
  cvApp,
  onCloseCv,
  negotiateApp,
  onCloseNegotiate,
  linkedinOpen,
  onCloseLinkedin,
  linkedinDefaultRole,
}: Props) {
  return (
    <>
      <CompanyIntelligenceModal
        jobId={intelJob?.id ?? null}
        jobTitle={intelJob?.title ?? ""}
        company={intelJob?.company ?? ""}
        location={intelJob?.location ?? null}
        open={intelJob !== null}
        onClose={onCloseIntel}
      />
      <HiringInsightsModal
        jobId={insightsJob?.id ?? null}
        jobTitle={insightsJob?.title ?? ""}
        open={insightsJob !== null}
        onClose={onCloseInsights}
      />
      <JobEmployerModal
        jobId={employerHubJob?.id ?? null}
        jobTitle={employerHubJob?.title ?? ""}
        company={employerHubJob?.company ?? ""}
        location={employerHubJob?.location ?? null}
        jobUrl={employerHubJob?.url}
        initialTab={employerHubJob?.initialTab ?? "contact"}
        open={employerHubJob !== null}
        onClose={onCloseEmployerHub}
      />
      <CvOptimizerModal
        applicationId={cvApp?.id ?? null}
        jobTitle={cvApp?.title ?? ""}
        open={cvApp !== null}
        onClose={onCloseCv}
      />
      <SalaryNegotiateModal
        applicationId={negotiateApp?.id ?? null}
        jobTitle={negotiateApp?.title ?? ""}
        open={negotiateApp !== null}
        onClose={onCloseNegotiate}
      />
      <LinkedinOptimizerModal
        open={linkedinOpen}
        onClose={onCloseLinkedin}
        defaultRole={linkedinDefaultRole}
      />
    </>
  );
}
