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
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarCandidateCardClass,
  talentRadarPrimaryCtaClass,
  talentRadarSecondaryCtaClass,
  talentRadarSignalChipClass,
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

export function TalentRadarCandidateCard({
  row,
  roleTitle,
  onDraft,
  onShortlist,
  onDismiss,
  onSnooze,
}: {
  row: TalentRadarCandidate;
  roleTitle: string;
  onDraft: () => void;
  onShortlist: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const whySurfaced = row.why_surfaced.slice(0, 2);
  const whyNow = row.why_now.slice(0, 2);
  const chipItems = [
    ...whySurfaced.map((text) => ({ text, kind: "positive" as const })),
    ...whyNow.map((text) => ({ text, kind: "timing" as const })),
    ...row.risks.slice(0, 1).map((text) => ({ text, kind: "risk" as const })),
  ].slice(0, 4);

  return (
    <Card
      variant="soft"
      className={`${talentRadarCandidateCardClass()} p-5`}
      data-testid={RECRUITER_TALENT_RADAR_MARKERS.candidateCard}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-3"
        data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardHeader}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{row.display_name}</h2>
          {row.headline ? <p className="twin-muted text-sm">{row.headline}</p> : null}
          {row.job_title ? (
            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{row.job_title}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <TalentRadarFitBadge score={row.score} />
          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs font-medium text-[var(--twin-muted-strong)]">
            {t(statusLabelKey(row.status))}
          </span>
        </div>
      </div>

      {whySurfaced.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("recruiterTalentRadar.whySurfaced")}
          </p>
          <ul className="mt-1.5 space-y-1">
            {whySurfaced.map((item) => (
              <li key={item} className="text-sm leading-snug text-[var(--foreground)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {whyNow.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("recruiterTalentRadar.whyNow")}
          </p>
          <ul className="mt-1.5 space-y-1">
            {whyNow.map((item) => (
              <li key={item} className="text-sm leading-snug text-[var(--foreground)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {chipItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chipItems.map((chip) => (
            <span key={chip.text} className={talentRadarSignalChipClass(chip.kind)}>
              {chip.text}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--twin-muted-strong)]">
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
          className="mt-4 space-y-3 border-t border-[var(--twin-border)]/60 pt-4"
          data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateCardDetails}
        >
          <RadarDetailSection title={t("recruiterTalentRadar.evidence")} items={row.evidence} />
          <RadarDetailSection title={t("recruiterTalentRadar.risks")} items={row.risks} variant="risk" />
          <RadarDetailSection title={t("recruiterTalentRadar.missingData")} items={row.missing_data} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={talentRadarInboxHighlightHref(Number(row.application_id ?? row.id))}
          className={talentRadarPrimaryCtaClass()}
        >
          {t("recruiterTalentRadar.ctaReviewCard")}
        </Link>
        <button type="button" className={talentRadarSecondaryCtaClass()} onClick={onDraft}>
          {t("recruiterTalentRadar.ctaDraft")}
        </button>
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
          className="ml-auto text-xs font-medium text-[var(--twin-muted-strong)] underline-offset-2 hover:underline"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t("recruiterTalentRadar.collapseDetails") : t("recruiterTalentRadar.expandDetails")}
        </button>
      </div>
    </Card>
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
