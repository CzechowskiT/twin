"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { CandidateOfferQuestionsPanel } from "@/components/shared/candidate-offer-questions-panel";
import { OfferComparisonPreview } from "@/components/shared/offer-comparison-preview";
import { OfferReadinessChecklist } from "@/components/shared/offer-readiness-checklist";
import { OfferReadinessEvidencePanel } from "@/components/shared/offer-readiness-evidence-panel";
import { OfferCalendarReadinessCard } from "@/components/shared/offer-calendar-readiness-card";
import { MicrosoftBusyReadCrossLinkCard } from "@/components/shared/microsoft-busy-read-cross-link-card";
import { OfferReadinessPanel } from "@/components/shared/offer-readiness-status-badge";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  CANDIDATE_OFFER_READINESS_CROSS_LINKS,
  CANDIDATE_OFFER_READINESS_MARKERS,
  CANDIDATE_OFFER_READINESS_PAGE_MARKER,
  CANDIDATE_OFFER_READINESS_SAFE_LINKS,
  resolveCandidateOfferReadinessView,
} from "@/lib/candidate-offer-readiness";
import type { OfferReadinessRecord } from "@/lib/offer-readiness";

function PreviewNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_OFFER_READINESS_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateOfferReadiness.notFoundTitle")}
          message={t("candidateOfferReadiness.notFoundMessage")}
          steps={[
            t("candidateOfferReadiness.notFoundStep1"),
            t("candidateOfferReadiness.notFoundStep2"),
          ]}
          actionLabel={t("candidateOfferReadiness.notFoundCta")}
          actionHref={CANDIDATE_OFFER_READINESS_SAFE_LINKS.jobs}
        />
      </div>
    </Shell>
  );
}

function PreviewContent({ record }: { record: OfferReadinessRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div
        data-candidate-offer-readiness-page={CANDIDATE_OFFER_READINESS_PAGE_MARKER}
        data-testid={CANDIDATE_OFFER_READINESS_MARKERS.page}
        className="space-y-6"
      >
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_OFFER_READINESS_SAFE_LINKS.jobs}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateOfferReadiness.linkJobs")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateOfferReadiness.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_OFFER_READINESS_MARKERS.header}
        >
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("candidateOfferReadiness.pageEyebrow")}
            </p>
            <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateOfferReadiness.pageTitle")}</h1>
          </div>
        </header>

        <div data-testid={CANDIDATE_OFFER_READINESS_MARKERS.summary}>
          <OfferReadinessPanel record={record} />
        </div>

        <div data-testid={CANDIDATE_OFFER_READINESS_MARKERS.checklist}>
          <OfferReadinessChecklist items={record.checklist} />
        </div>

        <div data-testid={CANDIDATE_OFFER_READINESS_MARKERS.comparison}>
          <OfferComparisonPreview rows={record.comparison_rows} />
        </div>

        <div data-testid={CANDIDATE_OFFER_READINESS_MARKERS.questions}>
          <CandidateOfferQuestionsPanel questions={record.questions} />
        </div>

        <OfferCalendarReadinessCard candidateId={record.candidate_id} />
        <MicrosoftBusyReadCrossLinkCard context="offer" candidateId={record.candidate_id} />

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={CANDIDATE_OFFER_READINESS_MARKERS.boundary}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-accent)]">
            {t("candidateOfferReadiness.boundaryTitle")}
          </h2>
          <p className="mt-3 text-sm text-[var(--twin-muted-strong)]">{t("candidateOfferReadiness.boundaryLead")}</p>
          <ul className="mt-3 space-y-2">
            {record.blocked_capabilities.map((cap) => (
              <li key={cap.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                <span className="font-medium">{t(cap.label_key)}</span>
                <p className="mt-1 text-[var(--twin-muted)]">{t(cap.reason_key)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--twin-muted)]">{t("candidateOfferReadiness.boundaryNote")}</p>
        </Card>

        <OfferReadinessEvidencePanel candidateId={record.candidate_id} />

        <nav
          className="flex flex-wrap gap-2"
          data-testid={CANDIDATE_OFFER_READINESS_MARKERS.crossLinks}
          aria-label={t("candidateOfferReadiness.crossLinksTitle")}
        >
          {CANDIDATE_OFFER_READINESS_CROSS_LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}

export function CandidateOfferReadinessWorkspace() {
  const record = resolveCandidateOfferReadinessView();
  if (!record) return <PreviewNotFound />;
  return <PreviewContent record={record} />;
}
