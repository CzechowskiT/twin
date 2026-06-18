"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import type { CandidateCorrectionRequestRecord } from "@/lib/candidate-correction-request-demo-data";
import {
  CANDIDATE_CORRECTION_REQUEST_MARKERS,
  candidateCorrectionRequestHref,
} from "@/lib/candidate-correction-request";
import type { TranslationKey } from "@/lib/i18n";

type CorrectionRequestPanelProps = {
  record: CandidateCorrectionRequestRecord;
  marker?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

function categoryTypeKey(type: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    profile_field: "candidateCorrectionRequest.categoryProfileField",
    skills_competency: "candidateCorrectionRequest.categorySkillsCompetency",
    experience_timeline: "candidateCorrectionRequest.categoryExperienceTimeline",
    education_credential: "candidateCorrectionRequest.categoryEducationCredential",
    visibility_scope: "candidateCorrectionRequest.categoryVisibilityScope",
    application_match_data: "candidateCorrectionRequest.categoryApplicationMatchData",
  };
  return map[type] ?? "candidateCorrectionRequest.categoryProfileField";
}

export function CorrectionRequestPanel({
  record,
  marker = CANDIDATE_CORRECTION_REQUEST_MARKERS.draftRequest,
  compact = false,
  showFullPageLink = true,
}: CorrectionRequestPanelProps) {
  const { t } = useTranslation();
  const drafts = record.bundle.draft_fields.slice(0, compact ? 2 : undefined);

  return (
    <div data-testid={marker} className="space-y-3">
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {compact ? t("candidateCorrectionRequest.panelLeadCompact") : t("candidateCorrectionRequest.panelLead")}
      </p>
      <ul className="space-y-3">
        {drafts.map((field) => (
          <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
            <p className="font-medium">{field.field_label}</p>
            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
              {t("candidateCorrectionRequest.currentValue")}: {field.current_value}
            </p>
            <p className="mt-1 text-xs">
              {t("candidateCorrectionRequest.proposedValue")}: {field.proposed_value}
            </p>
            <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{field.rationale}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
          data-testid={`${marker}-submit`}
        >
          {t("candidateCorrectionRequest.submitDisabledCta")}
        </button>
        {showFullPageLink ? (
          <Link
            href={candidateCorrectionRequestHref()}
            className="twin-link text-xs font-medium"
            data-testid={`${marker}-full-page-link`}
          >
            {t("candidateCorrectionRequest.linkFullPage")}
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateCorrectionRequest.demoOnlyHint")}</p>
    </div>
  );
}

export function CorrectionCategoryLabel({ type }: { type: string }) {
  const { t } = useTranslation();
  return <>{t(categoryTypeKey(type))}</>;
}
