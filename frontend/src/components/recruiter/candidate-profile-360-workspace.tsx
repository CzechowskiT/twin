"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { TranslationKey } from "@/lib/i18n";
import type { CandidateProfile360Record } from "@/lib/candidate-profile-360-demo-data";
import {
  CANDIDATE_PROFILE_360_MARKERS,
  CANDIDATE_PROFILE_360_PAGE_MARKER,
  type CandidateProfile360Surface,
  resolveCandidateProfile360,
} from "@/lib/candidate-profile-360";

function fitLabelKey(fit: CandidateProfile360Record["fit_label"]): TranslationKey {
  const map: Record<CandidateProfile360Record["fit_label"], TranslationKey> = {
    strong: "candidateProfile360.fitStrong",
    good: "candidateProfile360.fitGood",
    possible: "candidateProfile360.fitPossible",
    weak: "candidateProfile360.fitWeak",
  };
  return map[fit];
}

function sectionCard(
  marker: string,
  title: string,
  children: ReactNode,
  className = "",
): ReactNode {
  return (
    <Card
      variant="soft"
      className={`border-[var(--twin-border)]/80 p-5 sm:p-6 ${className}`}
      data-testid={marker}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function statusKey(status: CandidateProfile360Record["status"]): TranslationKey {
  const map: Record<CandidateProfile360Record["status"], TranslationKey> = {
    ready_to_review: "candidateProfile360.statusReady",
    needs_verification: "candidateProfile360.statusNeedsVerification",
    consent_check_required: "candidateProfile360.statusConsent",
  };
  return map[status];
}

function backHref(record: CandidateProfile360Record, surface: CandidateProfile360Surface): string {
  if (record.back_target === "talent_pool") {
    return surface === "company" ? "/company/talent-pool" : "/recruiter/talent-pool";
  }
  if (record.back_target === "inbox") return "/recruiter/inbox";
  return "/recruiter/talent-radar";
}

function backLabelKey(record: CandidateProfile360Record): TranslationKey {
  if (record.back_target === "talent_pool") return "candidateProfile360.backToPool";
  if (record.back_target === "inbox") return "candidateProfile360.backToInbox";
  return "candidateProfile360.backToRadar";
}

function decisionStateKey(state: CandidateProfile360Record["decision_state"]): TranslationKey {
  const map: Record<CandidateProfile360Record["decision_state"], TranslationKey> = {
    shortlisted: "candidateProfile360.decisionShortlisted",
    snoozed: "candidateProfile360.decisionSnoozed",
    dismissed: "candidateProfile360.decisionDismissed",
    draft: "candidateProfile360.decisionDraft",
    active: "candidateProfile360.decisionActive",
  };
  return map[state];
}

function decisionEventKey(action: CandidateProfile360Record["decision_events"][number]["action"]): TranslationKey {
  const map: Record<
    CandidateProfile360Record["decision_events"][number]["action"],
    TranslationKey
  > = {
    shortlisted: "candidateProfile360.eventShortlisted",
    snoozed: "candidateProfile360.eventSnoozed",
    dismissed: "candidateProfile360.eventDismissed",
    draft_prepared: "candidateProfile360.eventDraft",
    reviewed: "candidateProfile360.eventReviewed",
  };
  return map[action];
}

function activityTypeKey(type: CandidateProfile360Record["activity_events"][number]["type"]): TranslationKey {
  const map: Record<CandidateProfile360Record["activity_events"][number]["type"], TranslationKey> = {
    imported: "candidateProfile360.activityImported",
    matched: "candidateProfile360.activityMatched",
    reviewed: "candidateProfile360.activityReviewed",
    note: "candidateProfile360.activityNote",
    digest: "candidateProfile360.activityDigest",
  };
  return map[type];
}

function ProfileNotFound({ surface }: { surface: CandidateProfile360Surface }) {
  const { t } = useTranslation();
  const back = surface === "company" ? "/company/talent-pool" : "/recruiter/talent-radar";

  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_PROFILE_360_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("candidateProfile360.notFoundTitle")}
          message={t("candidateProfile360.notFoundMessage")}
          steps={[
            t("candidateProfile360.notFoundStep1"),
            t("candidateProfile360.notFoundStep2"),
            t("candidateProfile360.notFoundStep3"),
          ]}
          actionLabel={t("candidateProfile360.notFoundCta")}
          actionHref={back}
        />
      </div>
    </Shell>
  );
}

function ProfileContent({
  record,
  surface,
}: {
  record: CandidateProfile360Record;
  surface: CandidateProfile360Surface;
}) {
  const { t } = useTranslation();
  const lastActivity = useMemo(() => record.last_activity.slice(0, 10), [record.last_activity]);

  return (
    <Shell wide rail>
      <div data-candidate-profile-360-page={CANDIDATE_PROFILE_360_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_PROFILE_360_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateProfile360.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{record.display_name}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{record.role_fit_title}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_PROFILE_360_MARKERS.pilotBadge}
              >
                {t("candidateProfile360.pilotBadge")}
              </span>
              <span className="rounded-full border border-[var(--twin-accent)]/40 bg-[var(--twin-accent)]/10 px-3 py-1 text-sm font-semibold text-[var(--twin-accent)]">
                {record.fit_score}% · {t(fitLabelKey(record.fit_label))}
              </span>
              <span className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs text-[var(--twin-muted-strong)]">
                {t(statusKey(record.status))}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--twin-muted-strong)]">
            <span>
              {t("candidateProfile360.trustConsent")}: {record.trust_label}
            </span>
            <span>
              {t("candidateProfile360.lastActivity")}: {lastActivity}
            </span>
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {t("candidateProfile360.humanDecisionRequired")}
            </span>
          </div>
          <Link href={backHref(record, surface)} className="twin-link text-sm font-medium">
            {t(backLabelKey(record))}
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.profileSummary,
            t("candidateProfile360.profileSummaryTitle"),
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("candidateProfile360.strengthsTitle")}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {record.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("candidateProfile360.risksTitle")}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-amber-200/90">
                  {record.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/60 p-3">
                <p className="text-xs font-semibold text-[var(--twin-accent)]">
                  {t("candidateProfile360.aiDraftLabel")}
                </p>
                <p className="mt-2 text-[var(--twin-muted-strong)]">{record.ai_draft_summary}</p>
              </div>
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.cvDocuments,
            t("candidateProfile360.cvDocumentsTitle"),
            <>
              <p>
                <span className="font-medium">{t("candidateProfile360.cvStatusLabel")}:</span> {record.cv_status}
              </p>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("candidateProfile360.experienceTitle")}
                </p>
                <ul className="mt-2 space-y-2">
                  {record.experience.map((row) => (
                    <li key={`${row.title}-${row.company}`}>
                      <span className="font-medium">{row.title}</span> · {row.company}
                      <span className="twin-muted block text-xs">{row.period}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("candidateProfile360.skillsTitle")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {record.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("candidateProfile360.evidenceTitle")}
                </p>
                <ul className="mt-2 space-y-1">
                  {record.evidence_links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="twin-link text-sm"
                      >
                        {link.label}
                      </a>
                      <span className="twin-muted ml-2 text-xs">{t("candidateProfile360.evidenceSampleOnly")}</span>
                    </li>
                  ))}
                </ul>
                <p className="twin-muted mt-2 text-xs">{t("candidateProfile360.noFakeDownloads")}</p>
              </div>
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.applications,
            t("candidateProfile360.applicationsTitle"),
            <>
              <p className="twin-muted text-xs">{t("candidateProfile360.noFakeDecisions")}</p>
              <ul className="space-y-3">
                {record.applications.map((app) => (
                  <li
                    key={`${app.role_title}-${app.company}`}
                    className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                  >
                    <p className="font-medium">
                      {app.role_title} · {app.company}
                    </p>
                    <p className="twin-muted mt-1 text-xs">{app.pipeline_stage}</p>
                    <p className="mt-2 text-xs">
                      {t("candidateProfile360.matchScore")}: {app.match_score}%
                    </p>
                    <p className="twin-muted mt-1 text-xs">{app.status_note}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.matches,
            t("candidateProfile360.matchesTitle"),
            <ul className="space-y-4">
              {record.matches.map((match) => (
                <li
                  key={`${match.role_title}-${match.company}`}
                  className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                >
                  <p className="font-medium">
                    {match.role_title} · {match.company}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--twin-accent)]">
                    {t("candidateProfile360.matchScore")}: {match.match_score}%
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[var(--twin-muted-strong)]">
                    {t("candidateProfile360.whyMatched")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {match.why_matched.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-semibold text-[var(--twin-muted-strong)]">
                    {t("candidateProfile360.missingInfo")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-amber-200/90">
                    {match.missing_info.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {t("candidateProfile360.recruiterDecisionRequired")}
                  </p>
                </li>
              ))}
            </ul>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.notes,
            t("candidateProfile360.notesTitle"),
            <GuidedEmptyState
              message={t("candidateProfile360.notesEmptyMessage")}
              steps={[t("candidateProfile360.notesEmptyStep1"), t("candidateProfile360.notesEmptyStep2")]}
              actionLabel={t("candidateProfile360.notesEmptyCta")}
              actionHref={surface === "company" ? "/company/talent-pool" : "/recruiter/inbox"}
            />,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.feedback,
            t("candidateProfile360.feedbackTitle"),
            <>
              <span className="inline-block rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs font-medium">
                {t("candidateProfile360.feedbackPlannedBadge")}
              </span>
              <p className="twin-muted mt-3">{t("candidateProfile360.feedbackEmptyMessage")}</p>
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.consent,
            t("candidateProfile360.consentTitle"),
            <>
              <p>
                <span className="font-medium">{t("candidateProfile360.consentStatus")}:</span> {record.consent_status}
              </p>
              <p>
                <span className="font-medium">{t("candidateProfile360.consentSource")}:</span> {record.consent_source}
              </p>
              <p>
                <span className="font-medium">{t("candidateProfile360.consentLastContact")}:</span>{" "}
                {record.consent_last_contact}
              </p>
              <div>
                <p className="font-medium">{t("candidateProfile360.consentAllowedUse")}</p>
                <ul className="mt-2 list-inside list-disc">
                  {record.consent_allowed_use.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {record.consent_requires_review ? (
                <p className="text-amber-200">{t("candidateProfile360.consentRequiresReview")}</p>
              ) : (
                <p className="twin-muted text-xs">{t("candidateProfile360.consentClear")}</p>
              )}
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.decisionMemory,
            t("candidateProfile360.decisionMemoryTitle"),
            <>
              <p className="font-medium">{t(decisionStateKey(record.decision_state))}</p>
              <ul className="mt-3 space-y-2 border-l border-[var(--twin-border)] pl-4">
                {record.decision_events.map((event) => (
                  <li key={`${event.action}-${event.at}`} className="text-xs">
                    <span className="font-semibold">{t(decisionEventKey(event.action))}</span>
                    <span className="twin-muted"> · {event.at.slice(0, 10)} · {event.actor}</span>
                    {event.note ? <p className="twin-muted mt-0.5">{event.note}</p> : null}
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            CANDIDATE_PROFILE_360_MARKERS.activity,
            t("candidateProfile360.activityTitle"),
            <ul className="space-y-2">
              {record.activity_events.map((event) => (
                <li key={`${event.type}-${event.at}`} className="flex gap-3 text-xs">
                  <span className="shrink-0 rounded bg-[var(--twin-surface-soft)] px-2 py-0.5 font-medium">
                    {t(activityTypeKey(event.type))}
                  </span>
                  <span>
                    {event.at.slice(0, 10)} — {event.summary}
                  </span>
                </li>
              ))}
            </ul>,
            "lg:col-span-2",
          )}
        </div>

        <Card
          variant="soft"
          className="border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/40 p-5"
          data-testid={CANDIDATE_PROFILE_360_MARKERS.boundary}
        >
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("candidateProfile360.boundaryTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {t("candidateProfile360.boundaryBody")}
          </p>
        </Card>
      </div>
    </Shell>
  );
}

export function CandidateProfile360Workspace({
  candidateId,
  surface,
}: {
  candidateId: string;
  surface: CandidateProfile360Surface;
}) {
  const record = resolveCandidateProfile360(candidateId);
  if (!record) {
    return <ProfileNotFound surface={surface} />;
  }
  return <ProfileContent record={record} surface={surface} />;
}
