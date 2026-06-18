
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  COMPANY_CANDIDATE_TRUST_SUMMARY_LINKS,
  COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS,
  COMPANY_CANDIDATE_TRUST_SUMMARY_PAGE_MARKER,
  companyCandidateTrustSummaryHref,
  resolveCompanyCandidateTrustSummary,
} from "@/lib/company-candidate-trust-summary";
import type { TranslationKey } from "@/lib/i18n";

function section(marker: string, title: string, children: ReactNode) {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={marker}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-2 text-sm">{children}</div>
    </Card>
  );
}

export function CompanyCandidateTrustSummaryWorkspace({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation();
  const record = resolveCompanyCandidateTrustSummary(candidateId);
  if (!record) {
    return (
      <Shell wide>
        <div data-testid={COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.notFound}>
          <GuidedEmptyState
            title={t("companyCandidateTrustSummary.pageTitle")}
            message={t("companyCandidateTrustSummary.boundaryBody")}
            steps={[t("companyCandidateTrustSummary.boundaryBody")]}
            actionLabel={t("companyCandidateTrustSummary.linkHiringCockpit")}
            actionHref={COMPANY_CANDIDATE_TRUST_SUMMARY_LINKS[0].href}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div
        data-company-candidate-trust-summary-page={COMPANY_CANDIDATE_TRUST_SUMMARY_PAGE_MARKER}
        data-testid={COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.page}
        className="space-y-6"
      >
        <CompanyWorkspaceNav />
        <header data-testid={COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.header} className="space-y-2 border-b border-[var(--twin-border)]/60 pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">{t("companyCandidateTrustSummary.pageEyebrow")}</p>
          <h1 className="twin-section-title text-2xl">{t("companyCandidateTrustSummary.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
          <span data-testid={COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.pilotBadge} className="inline-block rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-200">{t("companyCandidateTrustSummary.pilotBadge")}</span>
        </header>
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.status, t("companyCandidateTrustSummary.statusTitle"), <p>{t("companyCandidateTrustSummary.statusLead")}</p>)}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.visibility, t("companyCandidateTrustSummary.visibilityTitle"), (
          <ul className="list-disc pl-4">{record.visibility_items.map((k) => <li key={k}>{t(k as TranslationKey)}</li>)}</ul>
        ))}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.evidence, t("companyCandidateTrustSummary.evidenceTitle"), (
          <ul className="list-disc pl-4">{record.evidence_refs.map((r) => <li key={r.id}>{t(r.label_key as TranslationKey)}</li>)}</ul>
        ))}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.notShared, t("companyCandidateTrustSummary.notSharedTitle"), (
          <ul className="list-disc pl-4">{record.not_shared_items.map((k) => <li key={k}>{t(k as TranslationKey)}</li>)}</ul>
        ))}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.reviewNotes, t("companyCandidateTrustSummary.reviewNotesTitle"), (
          <ul className="list-disc pl-4">{record.review_notes.map((k) => <li key={k}>{t(k as TranslationKey)}</li>)}</ul>
        ))}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.boundary, t("companyCandidateTrustSummary.boundaryTitle"), <p className="text-xs">{t("companyCandidateTrustSummary.boundaryBody")}</p>)}
        {section(COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS.linkedModules, t("companyCandidateTrustSummary.linkedModulesTitle"), (
          <div className="flex flex-wrap gap-3">{COMPANY_CANDIDATE_TRUST_SUMMARY_LINKS.map((l) => <Link key={l.id} href={l.href} className="twin-link text-xs">{t(l.labelKey)}</Link>)}</div>
        ))}
      </div>
    </Shell>
  );
}
