"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type {
  CandidateDataSourceKind,
  CandidateTrustCenterRecord,
  CommunicationPreference,
  TrustTimelineEventType,
  VisibilityScope,
} from "@/lib/candidate-trust-center-demo-data";
import {
  CANDIDATE_TRUST_CENTER_MARKERS,
  CANDIDATE_TRUST_CENTER_PAGE_MARKER,
  CANDIDATE_TRUST_CENTER_SAFE_LINKS,
  resolveCandidateTrustCenter,
} from "@/lib/candidate-trust-center";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode, className = ""): ReactNode {
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

function dataSourceKey(kind: CandidateDataSourceKind): TranslationKey {
  const map: Record<CandidateDataSourceKind, TranslationKey> = {
    profile_cv: "candidateTrustCenter.sourceProfileCv",
    application_submitted: "candidateTrustCenter.sourceApplication",
    calendar_oauth: "candidateTrustCenter.sourceCalendar",
    identity_kyc: "candidateTrustCenter.sourceIdentity",
    referral: "candidateTrustCenter.sourceReferral",
    match_signal: "candidateTrustCenter.sourceMatchSignal",
  };
  return map[kind];
}

function visibilitySurfaceKey(surface: VisibilityScope["surface"]): TranslationKey {
  const map: Record<VisibilityScope["surface"], TranslationKey> = {
    applications: "candidateTrustCenter.visibilityApplications",
    offers: "candidateTrustCenter.visibilityOffers",
    matches: "candidateTrustCenter.visibilityMatches",
  };
  return map[surface];
}

function commChannelKey(channel: CommunicationPreference["channel"]): TranslationKey {
  const map: Record<CommunicationPreference["channel"], TranslationKey> = {
    email: "candidateTrustCenter.channelEmail",
    in_app: "candidateTrustCenter.channelInApp",
    calendar_hold: "candidateTrustCenter.channelCalendarHold",
    recruiter_contact: "candidateTrustCenter.channelRecruiterContact",
  };
  return map[channel];
}

function commStatusKey(status: CommunicationPreference["status"]): TranslationKey {
  const map: Record<CommunicationPreference["status"], TranslationKey> = {
    opt_in: "candidateTrustCenter.commStatusOptIn",
    review_required: "candidateTrustCenter.commStatusReviewRequired",
    not_live: "candidateTrustCenter.commStatusNotLive",
    disabled: "candidateTrustCenter.commStatusDisabled",
  };
  return map[status];
}

function consentStatusKey(status: "active" | "review_required" | "not_live"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    active: "candidateTrustCenter.consentStatusActive",
    review_required: "candidateTrustCenter.consentStatusReviewRequired",
    not_live: "candidateTrustCenter.consentStatusNotLive",
  };
  return map[status];
}

function timelineEventKey(type: TrustTimelineEventType): TranslationKey {
  const map: Record<TrustTimelineEventType, TranslationKey> = {
    profile_updated: "candidateTrustCenter.eventProfileUpdated",
    consent_recorded: "candidateTrustCenter.eventConsentRecorded",
    application_submitted: "candidateTrustCenter.eventApplicationSubmitted",
    match_surfaced: "candidateTrustCenter.eventMatchSurfaced",
    identity_check: "candidateTrustCenter.eventIdentityCheck",
    export_requested: "candidateTrustCenter.eventExportRequested",
  };
  return map[type];
}

function TrustCenterNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_TRUST_CENTER_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateTrustCenter.notFoundTitle")}
          message={t("candidateTrustCenter.notFoundMessage")}
          steps={[
            t("candidateTrustCenter.notFoundStep1"),
            t("candidateTrustCenter.notFoundStep2"),
            t("candidateTrustCenter.notFoundStep3"),
          ]}
          actionLabel={t("candidateTrustCenter.notFoundCta")}
          actionHref={CANDIDATE_TRUST_CENTER_SAFE_LINKS.panel}
        />
      </div>
    </Shell>
  );
}

function TrustCenterContent({ record }: { record: CandidateTrustCenterRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div data-candidate-trust-center-page={CANDIDATE_TRUST_CENTER_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.panel} className="twin-link twin-touch-target mb-4 inline-block text-sm">
              ← {t("dashboard.title")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateTrustCenter.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_TRUST_CENTER_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateTrustCenter.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateTrustCenter.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_TRUST_CENTER_MARKERS.pilotBadge}
              >
                {t("candidateTrustCenter.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.trust_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateTrustCenter.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={candidateControlCenterHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-controls-link"
            >
              {t("candidateControlCenter.linkControlCenter")}
            </Link>
            <Link
              href={candidateExportPreviewHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-export-preview-link"
            >
              {t("candidateExportPreview.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-profile-link"
            >
              {t("candidateTrustCenter.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-jobs-link"
            >
              {t("candidateTrustCenter.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-matches-link"
            >
              {t("candidateTrustCenter.linkMatches")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.applications}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-applications-link"
            >
              {t("candidateTrustCenter.linkApplications")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.identity}
              className="twin-link font-medium"
              data-testid="candidate-trust-center-identity-link"
            >
              {t("candidateTrustCenter.linkIdentity")}
            </Link>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.whatTwinKnows,
          t("candidateTrustCenter.whatTwinKnowsTitle"),
          <>
            <p>{record.twin_knows_summary}</p>
            <ul className="list-inside list-disc space-y-1">
              {record.twin_knows_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.dataSources,
          t("candidateTrustCenter.dataSourcesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.dataSourcesLead")}</p>
            <ul className="space-y-3">
              {record.data_sources.map((source) => (
                <li key={source.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{t(dataSourceKey(source.kind))}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{source.detail}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">
                    {t("candidateTrustCenter.lastSynced")}: {source.last_synced_at.slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.visibility,
          t("candidateTrustCenter.visibilityTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.visibilityLead")}</p>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              {record.visibility_scopes.map((scope) => (
                <div key={scope.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{t(visibilitySurfaceKey(scope.surface))}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                    {t("candidateTrustCenter.sharedColumn")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {scope.shared_with_recruiters.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
                    {t("candidateTrustCenter.notSharedColumn")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {scope.not_shared.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.consentDataUse,
          t("candidateTrustCenter.consentDataUseTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.notLegalAdvice")}</p>
            <ul className="space-y-3">
              {record.consent_items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">{item.purpose}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                  </div>
                  <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t(consentStatusKey(item.status))}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/consent/gdpr" className="twin-link text-xs font-medium">
              {t("candidateTrustCenter.linkGdprConsent")}
            </Link>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.communicationPreferences,
          t("candidateTrustCenter.communicationPreferencesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.communicationPreferencesLead")}</p>
            <ul className="space-y-2">
              {record.communication_preferences.map((pref) => (
                <li key={pref.channel} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 px-3 py-2">
                  <span className="font-medium">{t(commChannelKey(pref.channel))}</span>
                  <span className="text-xs text-[var(--twin-muted-strong)]">{t(commStatusKey(pref.status))}</span>
                  <p className="w-full text-xs text-[var(--twin-muted)]">{pref.note}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.humanDecisioning,
          t("candidateTrustCenter.humanDecisioningTitle"),
          <>
            <p>{record.human_decision_note}</p>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.humanDecisioningLead")}</p>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.candidateControls,
          t("candidateTrustCenter.candidateControlsTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.candidateControlsLead")}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                {t("candidateTrustCenter.exportCta")}
              </button>
              <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                {t("candidateTrustCenter.deleteCta")}
              </button>
              <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                {t("candidateTrustCenter.revokeCta")}
              </button>
            </div>
            <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateTrustCenter.noMutation")}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <Link href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.evidence} className="twin-link">
                {t("candidateTrustCenter.linkEvidence")}
              </Link>
              <Link href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.cv} className="twin-link">
                {t("candidateTrustCenter.linkCv")}
              </Link>
              <Link href={CANDIDATE_TRUST_CENTER_SAFE_LINKS.plan} className="twin-link">
                {t("candidateTrustCenter.linkPlan")}
              </Link>
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.trustTimeline,
          t("candidateTrustCenter.trustTimelineTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustCenter.trustTimelineLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.trust_timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {t(timelineEventKey(event.type))} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateTrustCenter.noOutboundSent")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_CENTER_MARKERS.boundary,
          t("candidateTrustCenter.boundaryTitle"),
          <p>{t("candidateTrustCenter.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateTrustCenterWorkspaceProps = {
  candidateId?: string;
};

export function CandidateTrustCenterWorkspace({ candidateId }: CandidateTrustCenterWorkspaceProps) {
  const record = resolveCandidateTrustCenter(candidateId);
  if (!record) return <TrustCenterNotFound />;
  return <TrustCenterContent record={record} />;
}
