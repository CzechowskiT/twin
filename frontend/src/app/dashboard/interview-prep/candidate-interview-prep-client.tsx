"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { CANDIDATE_INTERVIEW_PREP_ROUTE } from "@/lib/candidate-interview-prep";

export default function CandidateInterviewPrepClient() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("candidateInterviewPrep.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("candidateInterviewPrep.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("candidateInterviewPrep.lead")}</p>
      </header>

      <Card variant="soft" className="border-[var(--twin-border)]/80 p-6">
        <h2 className="text-lg font-semibold">{t("candidateInterviewPrep.howTitle")}</h2>
        <ol className="twin-muted mt-3 list-inside list-decimal space-y-2 text-sm">
          <li>{t("candidateInterviewPrep.step1")}</li>
          <li>{t("candidateInterviewPrep.step2")}</li>
          <li>{t("candidateInterviewPrep.step3")}</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/calendar" className="twin-btn-primary text-sm">
            {t("candidateInterviewPrep.ctaCalendar")}
          </Link>
          <Link href="/dashboard" className="twin-link text-sm font-medium">
            {t("candidateInterviewPrep.backDashboard")}
          </Link>
        </div>
      </Card>

      <p className="twin-muted mt-6 text-xs">{t("candidateInterviewPrep.scopeNote")}</p>
    </Shell>
  );
}
