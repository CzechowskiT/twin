"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import {
  RECRUITER_TALENT_RADAR_MARKERS,
  talentRadarInboxHighlightHref,
  type TalentRadarCandidate,
} from "@/lib/recruiter-talent-radar";
import {
  TALENT_RADAR_DECISION_MARKERS,
  effectiveDecisionState,
  showsDraftPreparedBadge,
  type TalentRadarLatestDecision,
} from "@/lib/recruiter-talent-radar-decisions";
import {
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarCandidateCardClass,
  talentRadarPrimaryCtaClass,
  talentRadarSecondaryCtaClass,
  talentRadarSignalChipClass,
  talentRadarTertiaryCtaClass,
} from "@/lib/recruiter-talent-radar-visual";

import { TalentRadarFitBadge } from "./talent-radar-fit-badge";

function statusLabelKey(status: TalentRadarCandidate["status"]): TranslationKey {
  const map: Record<TalentRadarCandidate["status"], TranslationKey> = {
    ready_to_review: "recruiterTalentRadar.statusReady",
    needs_verification: "recruiterTalentRadar.statusNeedsVerification",
    consent_check_required: "recruiterTalentRadar.statusConsent",
    stale_data: "recruiterTalentRadar.statusStale",
    not_enough_evidence: "recruiterTalentRadar.statusNotEnough",
  };
  return map[status];
}

function decisionBadgeKey(row: TalentRadarCandidate): TranslationKey | null {
  const state = effectiveDecisionState(row.latest_decision);
  if (state !== "active") {
    const map: Record<Exclude<ReturnType<typeof effectiveDecisionState>, "active">, TranslationKey> = {
      shortlisted: "recruiterTalentRadar.badgeShortlisted",
      snoozed: "recruiterTalentRadar.badgeSnoozed",
      dismissed: "recruiterTalentRadar.badgeDismissed",
    };
    return map[state];
  }
  if (showsDraftPreparedBadge(row.latest_decision)) {
    return "recruiterTalentRadar.badgeDraftPrepared";
  }
  return null;
}

function lastDecisionLabelKey(decision: TalentRadarLatestDecision): TranslationKey {
  if (decision.action_type === "draft_prepared") return "recruiterTalentRadar.badgeDraftPrepared";
  if (decision.action_type === "shortlisted") return "recruiterTalentRadar.badgeShortlisted";
  if (decision.action_type === "snoozed") return "recruiterTalentRadar.badgeSnoozed";
  if (decision.action_type === "dismissed") return "recruiterTalentRadar.badgeDismissed";
  return "recruiterTalentRadar.decisionReviewLogged";
}

export function TalentRadarCandidateCard({
  row,
  roleTitle,
  onDraft,
  onShortlist,
  onDismiss,
  onSnooze,
  onReviewCardOpen,
  draftPreparing,
}: {
  row: TalentRadarCandidate;
  roleTitle: string;
  onDraft: () => void;
  onShortlist: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
  onReviewCardOpen?: () => void;
  draftPreparing?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const badgeKey = decisionBadgeKey(row);

  const whySurfaced = row.why_surfaced.slice(0, 2);
  const whyNow = row.why_now.slice(0, 2);
  const riskChips = row.risks.slice(0, 1);
  const roleLabel = roleTitle || row.job_title;

  return (
    <Card
      variant="soft"
      className={`${talentRadarCandidateCardClass()} p-5 sm:p-6`}
      data-testid={RECRUITER_TALENT_RADAR_MARKERS.candidateCard}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--twin-border)]/50 pb-4"
        data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardHeader}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{row.display_name}</h2>
          {row.headline ? <p className="twin-muted text-sm">{row.headline}</p> : null}
          {roleLabel ? (
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {roleLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <TalentRadarFitBadge score={row.score} />
          {badgeKey ? (
            <span
              className="rounded-full border border-[var(--twin-accent)]/40 bg-[var(--twin-accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--twin-accent)]"
              data-testid={TALENT_RADAR_DECISION_MARKERS.decisionBadge}
            >
              {t(badgeKey)}
            </span>
          ) : null}
          <span
            className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--twin-muted-strong)]"
            data-testid={TALENT_RADAR_VISUAL_MARKERS.evidenceBadge}
          >
            {t("recruiterTalentRadar.evidenceBadge")} · {row.data_confidence}
          </span>
          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--twin-muted-strong)]">
            {t(statusLabelKey(row.status))}
          </span>
          {row.source === "imported_internal_pool" || row.source_signals?.includes("talent_pool") ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {t("recruiterTalentRadar.chipTalentPoolSource")}
            </span>
          ) : null}
        </div>
      </div>

      {whySurfaced.length > 0 || whyNow.length > 0 || riskChips.length > 0 ? (
        <div
          className="mt-4 space-y-3"
          data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardChipGroup}
        >
          {whySurfaced.length > 0 ? (
            <ChipGroup label={t("recruiterTalentRadar.whySurfaced")}>
              {whySurfaced.map((text) => (
                <span key={text} className={talentRadarSignalChipClass("positive")}>
                  {text}
                </span>
              ))}
            </ChipGroup>
          ) : null}
          {whyNow.length > 0 ? (
            <ChipGroup label={t("recruiterTalentRadar.whyNow")}>
              {whyNow.map((text) => (
                <span key={text} className={talentRadarSignalChipClass("timing")}>
                  {text}
                </span>
              ))}
            </ChipGroup>
          ) : null}
          {riskChips.length > 0 ? (
            <ChipGroup label={t("recruiterTalentRadar.risks")}>
              {riskChips.map((text) => (
                <span key={text} className={talentRadarSignalChipClass("risk")}>
                  {text}
                </span>
              ))}
            </ChipGroup>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--twin-muted-strong)]">
        <span>
          {t("recruiterTalentRadar.dataConfidence")}: {row.data_confidence}
        </span>
        {row.last_interaction ? (
          <span>
            {t("recruiterTalentRadar.lastInteraction")}: {row.last_interaction.slice(0, 10)}
          </span>
        ) : null}
        <span className="font-medium text-amber-700 dark:text-amber-400">
          {t("recruiterTalentRadar.humanDecisionRequired")}
        </span>
      </div>

      {expanded ? (
        <div
          className="mt-4"
          data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardDetails}
        >
          <div
            className="space-y-4 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/80 p-4"
            data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardDetailsPanel}
          >
            <RadarDetailSection title={t("recruiterTalentRadar.evidence")} items={row.evidence} />
            <RadarDetailSection title={t("recruiterTalentRadar.risks")} items={row.risks} variant="risk" />
            <RadarDetailSection title={t("recruiterTalentRadar.missingData")} items={row.missing_data} />
            {row.latest_decision ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                  {t("recruiterTalentRadar.lastDecision")}
                </p>
                <p className="mt-1 text-sm text-[var(--foreground)]">
                  {t(lastDecisionLabelKey(row.latest_decision))}
                  {row.latest_decision.created_at
                    ? ` · ${row.latest_decision.created_at.slice(0, 10)}`
                    : null}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className="mt-5 space-y-3 border-t border-[var(--twin-border)]/50 pt-4"
        data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardCtaRow}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={talentRadarInboxHighlightHref(Number(row.application_id ?? row.id))}
            className={talentRadarPrimaryCtaClass()}
            onClick={() => onReviewCardOpen?.()}
          >
            {t("recruiterTalentRadar.ctaReviewCard")}
          </Link>
          <button
            type="button"
            className={talentRadarSecondaryCtaClass()}
            onClick={onDraft}
            disabled={draftPreparing}
          >
            {draftPreparing ? t("recruiterTalentRadar.draftPreparing") : t("recruiterTalentRadar.ctaDraft")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={talentRadarSecondaryCtaClass()} onClick={onShortlist}>
            {t("recruiterTalentRadar.ctaShortlist")}
          </button>
          <button type="button" className={talentRadarSecondaryCtaClass()} onClick={onSnooze}>
            {t("recruiterTalentRadar.ctaSnooze")}
          </button>
          <button type="button" className={talentRadarSecondaryCtaClass()} onClick={onDismiss}>
            {t("recruiterTalentRadar.ctaNotRelevant")}
          </button>
          <button
            type="button"
            className={`${talentRadarTertiaryCtaClass()} ml-auto`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? t("recruiterTalentRadar.collapseDetails") : t("recruiterTalentRadar.expandDetails")}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function RadarDetailSection({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant?: "risk";
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</p>
      <ul
        className={`mt-1 list-inside list-disc text-sm ${variant === "risk" ? "text-amber-800 dark:text-amber-300" : ""}`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
