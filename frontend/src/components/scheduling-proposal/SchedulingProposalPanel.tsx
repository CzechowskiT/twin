"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import type { SchedulingProposalPersona } from "@/lib/scheduling-proposal-demo-data";
import {
  SCHEDULING_PROPOSAL_MARKERS,
  SCHEDULING_PROPOSAL_PAGE_MARKER,
  resolveSchedulingProposal,
  schedulingProposalChecklistStatusKey,
  schedulingProposalCrossLinks,
  schedulingProposalSignalStatusKey,
  schedulingProposalSourceKey,
  schedulingProposalStatusKey,
} from "@/lib/scheduling-proposal";
import type { TranslationKey } from "@/lib/i18n";

const PERSONA_SUBTITLE_KEYS: Record<SchedulingProposalPersona, TranslationKey> = {
  candidate: "schedulingProposal.subtitleCandidate",
  recruiter: "schedulingProposal.subtitleRecruiter",
  company: "schedulingProposal.subtitleCompany",
  board: "schedulingProposal.subtitleBoard",
};

type Props = {
  persona: SchedulingProposalPersona;
};

export function SchedulingProposalPanel({ persona }: Props): ReactNode {
  const { t } = useTranslation();
  const proposal = useMemo(() => resolveSchedulingProposal(persona), [persona]);
  const crossLinks = useMemo(() => schedulingProposalCrossLinks(persona), [persona]);

  return (
    <Shell wide rail={persona === "candidate"}>
      <div
        data-scheduling-proposal-page={SCHEDULING_PROPOSAL_PAGE_MARKER}
        data-testid={SCHEDULING_PROPOSAL_MARKERS.page}
        className="space-y-6"
      >
        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("schedulingProposal.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("schedulingProposal.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{t(PERSONA_SUBTITLE_KEYS[persona])}</p>
            </div>
            <span
              className="inline-block rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-semibold uppercase"
              data-testid={SCHEDULING_PROPOSAL_MARKERS.readOnlyBadge}
            >
              {t("schedulingProposal.readOnlyBadge")}
            </span>
          </div>
          <p className="font-mono text-xs text-[var(--twin-muted)]">
            {proposal.proposalId} · {proposal.candidateId} · {proposal.roleId}
          </p>
          <span
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-testid={SCHEDULING_PROPOSAL_MARKERS.sourceBadge}
          >
            {t(schedulingProposalSourceKey(proposal.source))}
          </span>
        </header>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.summary}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("schedulingProposal.summaryTitle")}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("schedulingProposal.summaryWindow")}</dt>
              <dd className="font-medium">{t(proposal.proposedWindowLabelKey)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("schedulingProposal.summaryDuration")}</dt>
              <dd className="font-medium">
                {proposal.proposedDurationMinutes} {t("schedulingProposal.summaryMinutes")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("schedulingProposal.summaryTimezone")}</dt>
              <dd className="font-medium">{t(proposal.timezoneLabelKey)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("schedulingProposal.summaryStatus")}</dt>
              <dd className="font-medium">{t(schedulingProposalStatusKey(proposal.status))}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[var(--twin-muted)]">{t("schedulingProposal.summaryNote")}</p>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.readinessSignals}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("schedulingProposal.readinessSignalsTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("schedulingProposal.readinessSignalsLead")}</p>
          <ul className="mt-4 space-y-2">
            {proposal.readinessSignals.map((signal) => (
              <li key={signal.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t(signal.labelKey)}</span>
                  <span className="text-[10px] uppercase text-[var(--twin-accent)]">
                    {t(schedulingProposalSignalStatusKey(signal.status))}
                  </span>
                </div>
                <p className="mt-1 text-[var(--twin-muted)]">{t(signal.evidenceKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.humanReview}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("schedulingProposal.humanReviewTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("schedulingProposal.humanReviewLead")}</p>
          <ul className="mt-4 space-y-2">
            {proposal.humanReviewChecklist.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>{t(item.itemKey)}</span>
                <span className="text-[10px] uppercase text-[var(--twin-accent)]">
                  {t(schedulingProposalChecklistStatusKey(item.status))}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.blockedActions}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-accent)]">
            {t("schedulingProposal.blockedActionsTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("schedulingProposal.blockedActionsLead")}</p>
          <ul className="mt-4 space-y-2">
            {proposal.blockedActions.map((action) => (
              <li key={action.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                <span className="font-medium">{t(action.actionKey)}</span>
                <p className="mt-1 text-[var(--twin-muted)]">{t(action.reasonKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.auditTrail}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("schedulingProposal.auditTrailTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("schedulingProposal.auditTrailLead")}</p>
          <ul className="mt-4 space-y-2">
            {proposal.auditTrail.map((entry) => (
              <li key={entry.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t(entry.labelKey)}</span>
                  <span className="text-[10px] text-[var(--twin-muted)]">{t(entry.timestampLabelKey)}</span>
                </div>
                <p className="mt-1 text-[var(--twin-muted)]">{t(entry.sourceKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <nav
          className="flex flex-wrap gap-2"
          data-testid={SCHEDULING_PROPOSAL_MARKERS.crossLinks}
          aria-label={t("schedulingProposal.crossLinksTitle")}
        >
          {crossLinks.map((link) => (
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
