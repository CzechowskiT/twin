"use client";

import { GlobalJobBriefPanel } from "@/components/career-assistant/global-job-brief-panel";

export function JobEmployerOverviewTab({
  company,
  jobTitle,
  location,
}: {
  company: string;
  jobTitle: string;
  location?: string | null;
}) {
  return <GlobalJobBriefPanel company={company} jobTitle={jobTitle} location={location} />;
}
