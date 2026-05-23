"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationTemplates } from "@/components/career/communication-templates";
import { CandidateScoringPanel } from "@/components/career/candidate-scoring-panel";
import { EmployerDashboard } from "@/components/career/employer-dashboard";
import {
  JobPostBuilder,
  type JobPostDraft,
} from "@/components/career/job-post-builder";
import { MiniAts } from "@/components/career/mini-ats";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export function EmployerWorkspace() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<JobPostDraft | null>(null);

  return (
    <Shell>
      <header className="mb-6 space-y-2">
        <Link href="/workspace/recruiter" className="twin-link text-sm">
          ← {t("workspace.recruiterHome")}
        </Link>
        <h1 className="text-2xl font-semibold">{t("careerDiscovery.employerHubTitle")}</h1>
        <p className="twin-muted max-w-2xl text-sm">{t("careerDiscovery.employerHubLead")}</p>
      </header>
      <EmployerDashboard stats={{ openRoles: 3, applications: 24, interviews: 6 }} />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <JobPostBuilder onChange={setDraft} />
        <div className="space-y-6">
          <CandidateScoringPanel draft={draft} />
          <MiniAts />
          <CommunicationTemplates />
        </div>
      </div>
    </Shell>
  );
}
