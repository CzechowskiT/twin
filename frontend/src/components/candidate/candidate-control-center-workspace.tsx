"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { ExportPreviewPanel } from "@/components/candidate/export-preview-panel";
import { CorrectionRequestPanel } from "@/components/candidate/correction-request-panel";
import { IdentityVerificationPanel } from "@/components/candidate/identity-verification-panel";
import { DataPortabilityPanel } from "@/components/candidate/data-portability-panel";
import { RevokeDeletePanel } from "@/components/candidate/revoke-delete-panel";
import { ConsentReceiptPanel } from "@/components/candidate/consent-receipt-panel";
import { TrustAuditExportPanel } from "@/components/candidate/trust-audit-export-panel";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type {
  AppMatchTransparencyItem,
  AuditTimelineEventType,
  CommunicationPrefControl,
  VisibilityControlSetting,
} from "@/lib/candidate-control-center-demo-data";
import {
  CANDIDATE_CONTROL_CENTER_MARKERS,
  CANDIDATE_CONTROL_CENTER_PAGE_MARKER,
  CANDIDATE_CONTROL_CENTER_SAFE_LINKS,
  resolveCandidateControlCenter,
} from "@/lib/candidate-control-center";
import { resolveCandidateExportPreview } from "@/lib/candidate-export-preview";
import { resolveCandidateCorrectionRequest } from "@/lib/candidate-correction-request";
import { resolveCandidateIdentityVerification } from "@/lib/candidate-identity-verification";
import { resolveCandidateDataPortability } from "@/lib/candidate-data-portability";
import { resolveCandidateRevokeDelete } from "@/lib/candidate-revoke-delete";
import { resolveCandidateConsentReceipt } from "@/lib/candidate-consent-receipt";
import { candidateTrustOverviewHref } from "@/lib/candidate-trust-overview";
import { resolveCandidateTrustAuditExport } from "@/lib/candidate-trust-audit-export";
import type { CandidateControlCenterRecord } from "@/lib/candidate-control-center-demo-data";
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

function visibilityStatusKey(status: VisibilityControlSetting["current"]): TranslationKey {
  const map: Record<VisibilityControlSetting["current"], TranslationKey> = {
    visible: "candidateControlCenter.visibilityVisible",
    hidden: "candidateControlCenter.visibilityHidden",
    review_required: "candidateControlCenter.visibilityReviewRequired",
  };
  return map[status];
}

function commChannelKey(channel: CommunicationPrefControl["channel"]): TranslationKey {
  const map: Record<CommunicationPrefControl["channel"], TranslationKey> = {
    email: "candidateControlCenter.channelEmail",
    in_app: "candidateControlCenter.channelInApp",
    calendar_hold: "candidateControlCenter.channelCalendarHold",
    recruiter_contact: "candidateControlCenter.channelRecruiterContact",
  };
  return map[channel];
}

function commStatusKey(status: CommunicationPrefControl["status"]): TranslationKey {
  const map: Record<CommunicationPrefControl["status"], TranslationKey> = {
    opt_in: "candidateControlCenter.commStatusOptIn",
    review_required: "candidateControlCenter.commStatusReviewRequired",
    not_live: "candidateControlCenter.commStatusNotLive",
    disabled: "candidateControlCenter.commStatusDisabled",
  };
  return map[status];
}

function consentStatusKey(status: "active" | "review_required" | "not_live"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    active: "candidateControlCenter.consentStatusActive",
    review_required: "candidateControlCenter.consentStatusReviewRequired",
    not_live: "candidateControlCenter.consentStatusNotLive",
  };
  return map[status];
}

function appMatchKindKey(kind: AppMatchTransparencyItem["kind"]): TranslationKey {
  const map: Record<AppMatchTransparencyItem["kind"], TranslationKey> = {
    application: "candidateControlCenter.appMatchApplication",
    match: "candidateControlCenter.appMatchMatch",
  };
  return map[kind];
}

function auditEventKey(type: AuditTimelineEventType): TranslationKey {
  const map: Record<AuditTimelineEventType, TranslationKey> = {
    visibility_reviewed: "candidateControlCenter.eventVisibilityReviewed",
    export_preview_opened: "candidateControlCenter.eventExportPreviewOpened",
    correction_preview_saved: "candidateControlCenter.eventCorrectionPreviewSaved",
    consent_reviewed: "candidateControlCenter.eventConsentReviewed",
    comm_pref_viewed: "candidateControlCenter.eventCommPrefViewed",
    revoke_planned: "candidateControlCenter.eventRevokePlanned",
  };
  return map[type];
}

function ControlCenterNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_CONTROL_CENTER_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateControlCenter.notFoundTitle")}
          message={t("candidateControlCenter.notFoundMessage")}
          steps={[
            t("candidateControlCenter.notFoundStep1"),
            t("candidateControlCenter.notFoundStep2"),
            t("candidateControlCenter.notFoundStep3"),
          ]}
          actionLabel={t("candidateControlCenter.notFoundCta")}
          actionHref={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.panel}
        />
      </div>
    </Shell>
  );
}

function ControlCenterContent({ record }: { record: CandidateControlCenterRecord }) {
  const { t } = useTranslation();
  const exportPreviewRecord = resolveCandidateExportPreview(record.id);
  const identityVerificationRecord = resolveCandidateIdentityVerification(record.id);
  const correctionRequestRecord = resolveCandidateCorrectionRequest(record.id);
  const dataPortabilityRecord = resolveCandidateDataPortability(record.id);
  const revokeDeleteRecord = resolveCandidateRevokeDelete(record.id);
  const trustAuditExportRecord = resolveCandidateTrustAuditExport(record.id);
  const consentReceiptRecord = resolveCandidateConsentReceipt(record.id);

  return (
    <Shell wide rail>
      <div data-candidate-control-center-page={CANDIDATE_CONTROL_CENTER_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.panel} className="twin-link twin-touch-target mb-4 inline-block text-sm">
              ← {t("dashboard.title")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateControlCenter.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_CONTROL_CENTER_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateControlCenter.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateControlCenter.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_CONTROL_CENTER_MARKERS.pilotBadge}
              >
                {t("candidateControlCenter.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.control_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateControlCenter.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-control-center-trust-link"
            >
              {t("candidateControlCenter.linkTrustCenter")}
            </Link>
            <Link
              href={candidateTrustOverviewHref()}
              className="twin-link font-medium"
              data-testid="candidate-control-center-overview-link"
            >
              {t("candidateControlCenter.linkTrustOverview")}
            </Link>
            <Link
              href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-control-center-profile-link"
            >
              {t("candidateControlCenter.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-control-center-jobs-link"
            >
              {t("candidateControlCenter.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-control-center-matches-link"
            >
              {t("candidateControlCenter.linkMatches")}
            </Link>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.visibilityControls,
          t("candidateControlCenter.visibilityControlsTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.visibilityControlsLead")}</p>
            <ul className="space-y-3">
              {record.visibility_controls.map((ctrl) => (
                <li key={ctrl.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">{ctrl.label}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{ctrl.note}</p>
                  </div>
                  <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t(visibilityStatusKey(ctrl.current))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateControlCenter.noMutation")}</p>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.exportPreview,
          t("candidateControlCenter.exportPreviewTitle"),
          exportPreviewRecord ? (
            <ExportPreviewPanel
              record={exportPreviewRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.exportPreview}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.exportPreviewLead")}</p>
              <ul className="space-y-3">
                {record.export_preview_sections.map((section) => (
                  <li key={section.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                    <p className="font-medium">{section.label}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                      {section.item_count} {t("candidateControlCenter.exportItemsLabel")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.identityVerification,
          t("candidateControlCenter.identityVerificationTitle"),
          identityVerificationRecord ? (
            <IdentityVerificationPanel
              record={identityVerificationRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.identityVerification}
            />
          ) : (
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.identityVerificationLead")}</p>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.correctionRequest,
          t("candidateControlCenter.correctionRequestTitle"),
          correctionRequestRecord ? (
            <CorrectionRequestPanel
              record={correctionRequestRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.correctionRequest}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.correctionRequestLead")}</p>
              <ul className="space-y-3">
                {record.correction_requests.map((req) => (
                  <li key={req.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                    <p className="font-medium">{req.field}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                      {t("candidateControlCenter.currentValue")}: {req.current_value}
                    </p>
                    <p className="mt-1 text-xs">
                      {t("candidateControlCenter.suggestedCorrection")}: {req.suggested_correction}
                    </p>
                    <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{req.note}</p>
                  </li>
                ))}
              </ul>
              <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                {t("candidateControlCenter.submitCorrectionCta")}
              </button>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.dataPortability,
          t("candidateControlCenter.dataPortabilityTitle"),
          dataPortabilityRecord ? (
            <DataPortabilityPanel
              record={dataPortabilityRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.dataPortability}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.dataPortabilityLead")}</p>
              <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                {t("candidateControlCenter.submitPortabilityCta")}
              </button>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.consentReview,
          t("candidateControlCenter.consentReviewTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.notLegalAdvice")}</p>
            <ul className="space-y-3">
              {record.consent_review_items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">{item.purpose}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                    <p className="mt-1 text-[10px] text-[var(--twin-muted)]">
                      {t("candidateControlCenter.lastReviewed")}: {item.last_reviewed_at.slice(0, 10)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t(consentStatusKey(item.status))}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={CANDIDATE_CONTROL_CENTER_SAFE_LINKS.gdprConsent} className="twin-link text-xs font-medium">
              {t("candidateControlCenter.linkGdprConsent")}
            </Link>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.communicationPreferences,
          t("candidateControlCenter.communicationPreferencesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.communicationPreferencesLead")}</p>
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
          CANDIDATE_CONTROL_CENTER_MARKERS.appMatchTransparency,
          t("candidateControlCenter.appMatchTransparencyTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.appMatchTransparencyLead")}</p>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {record.app_match_transparency.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">
                    {t(appMatchKindKey(item.kind))} · {item.role_title}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{item.role_id}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                    {t("candidateControlCenter.sharedColumn")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {item.shared_fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
                    {t("candidateControlCenter.withheldColumn")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {item.withheld_fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.revokeDeletePlanned,
          t("candidateControlCenter.revokeDeleteTitle"),
          revokeDeleteRecord ? (
            <RevokeDeletePanel
              record={revokeDeleteRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.revokeDeletePlanned}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.revokeDeleteLead")}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                  {t("candidateControlCenter.revokeCta")}
                </button>
                <button type="button" disabled className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50">
                  {t("candidateControlCenter.deleteCta")}
                </button>
              </div>
              <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateControlCenter.noMutation")}</p>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.trustAuditExport,
          t("candidateControlCenter.trustAuditExportTitle"),
          trustAuditExportRecord ? (
            <TrustAuditExportPanel
              record={trustAuditExportRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.trustAuditExport}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.trustAuditExportLead")}</p>
              <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateControlCenter.noMutation")}</p>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.trustConsentReceipt,
          t("candidateControlCenter.trustConsentReceiptTitle"),
          consentReceiptRecord ? (
            <ConsentReceiptPanel
              record={consentReceiptRecord}
              compact
              marker={CANDIDATE_CONTROL_CENTER_MARKERS.trustConsentReceipt}
            />
          ) : (
            <>
              <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.trustConsentReceiptLead")}</p>
              <p className="text-[10px] text-[var(--twin-muted)]">{t("candidateControlCenter.noMutation")}</p>
            </>
          ),
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.auditTimeline,
          t("candidateControlCenter.auditTimelineTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateControlCenter.auditTimelineLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.audit_timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {t(auditEventKey(event.type))} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateControlCenter.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONTROL_CENTER_MARKERS.boundary,
          t("candidateControlCenter.boundaryTitle"),
          <p>{t("candidateControlCenter.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateControlCenterWorkspaceProps = {
  candidateId?: string;
};

export function CandidateControlCenterWorkspace({ candidateId }: CandidateControlCenterWorkspaceProps) {
  const record = resolveCandidateControlCenter(candidateId);
  if (!record) return <ControlCenterNotFound />;
  return <ControlCenterContent record={record} />;
}
