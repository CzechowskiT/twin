"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  type DigestCandidate,
  type DigestSectionMeta,
  type DismissPattern,
  type LowCoverageRole,
} from "@/lib/recruiter-talent-radar-digest";
import { RECRUITER_TALENT_RADAR_ROUTE } from "@/lib/recruiter-talent-radar";

type SectionId =
  | "reviewFirst"
  | "returningFromSnooze"
  | "shortlistedWithoutFollowUp"
  | "dismissedPatterns"
  | "lowCoverageRoles"
  | "draftsPrepared";

type SectionProps = {
  sectionId: SectionId;
  titleKey: TranslationKey;
  emptyKey: TranslationKey;
  meta?: DigestSectionMeta;
} & (
  | {
      kind: "candidates";
      items: DigestCandidate[];
      showNotSent?: boolean;
    }
  | {
      kind: "dismissed";
      items: DismissPattern[];
    }
  | {
      kind: "roles";
      items: LowCoverageRole[];
    }
);

function actionLabelKey(action: string): TranslationKey | null {
  const map: Record<string, TranslationKey> = {
    open_review_card: "recruiterTalentRadarDigest.actionOpenReviewCard",
    prepare_outreach_draft: "recruiterTalentRadarDigest.actionPrepareDraft",
    review_draft_not_sent: "recruiterTalentRadarDigest.actionReviewDraft",
    refine_role_criteria: "recruiterTalentRadarDigest.actionRefineRole",
    review_dismiss_patterns: "recruiterTalentRadarDigest.actionReviewDismiss",
  };
  return map[action] ?? null;
}

function CandidateRow({ row, showNotSent }: { row: DigestCandidate; showNotSent?: boolean }) {
  const { t } = useTranslation();
  const actionKey = actionLabelKey(row.recommendedNextAction);

  return (
    <div
      className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4 shadow-sm"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.candidateCard}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{row.displayName}</p>
          {row.roleTitle ? (
            <p className="text-xs text-[var(--twin-muted-strong)]">{row.roleTitle}</p>
          ) : null}
        </div>
        {row.fitLabel ? (
          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {row.fitLabel}
          </span>
        ) : null}
      </div>
      {row.aggregateLabel ? (
        <p className="mt-2 text-xs font-medium text-amber-400/90" data-testid="digest-aggregate-label">
          {row.aggregateLabel}
        </p>
      ) : null}
      {row.whyNow && row.whyNow.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{row.whyNow[0]}</p>
      ) : null}
      {showNotSent && !row.aggregateLabel ? (
        <p className="mt-2 text-xs font-medium text-amber-400/90">{t("recruiterTalentRadarDigest.draftNotSent")}</p>
      ) : null}
      {actionKey ? (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--twin-accent)]">
          {t(`recruiterTalentRadarDigest.nextAction` as TranslationKey)}: {t(actionKey)}
        </p>
      ) : null}
      <Link
        href={RECRUITER_TALENT_RADAR_ROUTE}
        className="mt-2 inline-block text-xs font-medium text-[var(--twin-accent)] underline"
      >
        {t("recruiterTalentRadarDigest.openInRadar")}
      </Link>
    </div>
  );
}

function MoreInRadarLink({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <Link
      href={RECRUITER_TALENT_RADAR_ROUTE}
      className="inline-block text-xs font-medium text-[var(--twin-accent)] underline"
      data-testid="digest-more-in-radar"
    >
      {t("recruiterTalentRadarDigest.moreInRadar").replace("{count}", String(count))}
    </Link>
  );
}

function CompactEmpty({ emptyKey }: { emptyKey: TranslationKey }) {
  const { t } = useTranslation();
  return (
    <p
      className="rounded-lg border border-dashed border-[var(--twin-border)] px-3 py-2 text-xs text-[var(--twin-muted-strong)]"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.emptyState}
    >
      {t(emptyKey)}
    </p>
  );
}

export function TalentRadarDigestSection(props: SectionProps) {
  const { t } = useTranslation();
  const { titleKey, emptyKey, meta } = props;
  const moreCount = meta?.moreInRadarCount ?? 0;

  return (
    <section
      className="space-y-3"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.section}
      data-section-id={props.sectionId}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{t(titleKey)}</h2>
        {meta && meta.totalCount > 0 ? (
          <span className="text-[11px] tabular-nums text-[var(--twin-muted-strong)]">
            {meta.shownCount}/{meta.totalCount}
          </span>
        ) : null}
      </div>
      {props.kind === "candidates" && props.items.length === 0 ? <CompactEmpty emptyKey={emptyKey} /> : null}
      {props.kind === "candidates"
        ? props.items.map((row) => (
            <CandidateRow
              key={`${props.sectionId}-${row.applicationId ?? row.candidateId}`}
              row={row}
              showNotSent={props.showNotSent}
            />
          ))
        : null}
      {props.kind === "dismissed" ? (
        props.items.length === 0 ? (
          <CompactEmpty emptyKey={emptyKey} />
        ) : (
          <ul className="space-y-2">
            {props.items.map((p) => (
              <li
                key={p.reasonCode}
                className="flex items-center justify-between rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2.5 text-sm shadow-sm"
              >
                <span className="text-[var(--foreground)]">{p.label}</span>
                <span className="tabular-nums font-semibold text-[var(--twin-muted-strong)]">{p.count}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {props.kind === "roles" ? (
        props.items.length === 0 ? (
          <CompactEmpty emptyKey={emptyKey} />
        ) : (
          <ul className="space-y-2">
            {props.items.map((role) => (
              <li
                key={role.jobId}
                className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-sm shadow-sm"
              >
                <p className="font-semibold text-[var(--foreground)]">{role.roleTitle}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                  {role.candidateCount} · {role.coverageWarning}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <MoreInRadarLink count={moreCount} />
    </section>
  );
}
