"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

/** Dopasowania — lands on ranked matches; deep-link scroll when opened from dashboard. */
export default function DashboardMatchesPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!getToken()) return;
    const timer = window.setTimeout(() => {
      router.replace(`${CANDIDATE_CANONICAL_ROUTES.panel}#dashboard-matches`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <Shell wide>
      <CandidateWorkspaceSubnav ariaLabel={t("workspaceModules.candidateMatchesTitle")} />
      <Card variant="soft" className="mt-6 p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("workspaceModules.candidateMatchesTitle")}
        </p>
        <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">
          {t("workspaceModules.candidateMatchesTitle")}
        </h1>
        <p className="twin-muted mt-4 text-sm leading-relaxed">
          {t("workspaceModules.candidateMatchesValue")}
        </p>
        <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.matchesLoading")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`${CANDIDATE_CANONICAL_ROUTES.panel}#dashboard-matches`} className="twin-btn-primary twin-touch-target">
            {t("workspaceModules.candidateMatchesCta")}
          </Link>
          <Link href={CANDIDATE_CANONICAL_ROUTES.jobs} className="twin-btn-secondary twin-touch-target">
            {t("nav.jobs")}
          </Link>
          <Link href={CANDIDATE_CANONICAL_ROUTES.profile} className="twin-btn-secondary twin-touch-target">
            {t("workspaceModules.candidateProfileCta")}
          </Link>
        </div>
      </Card>
    </Shell>
  );
}
