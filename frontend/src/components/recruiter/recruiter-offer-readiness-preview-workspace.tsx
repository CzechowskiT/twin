"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { OfferComparisonPreview } from "@/components/shared/offer-comparison-preview";
import { OfferReadinessChecklist } from "@/components/shared/offer-readiness-checklist";
import { OfferReadinessEvidencePanel } from "@/components/shared/offer-readiness-evidence-panel";
import { OfferCalendarReadinessCard } from "@/components/shared/offer-calendar-readiness-card";
import { OfferReadinessPanel } from "@/components/shared/offer-readiness-status-badge";
import { Card, Shell } from "@/components/ui";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { OfferReadinessRecord } from "@/lib/offer-readiness";
import {
  COMPANY_OFFER_READINESS_MARKERS,
  COMPANY_OFFER_READINESS_PAGE_MARKER,
  offerReadinessPreviewSource,
  offerReadinessSourceKey,
  RECRUITER_OFFER_READINESS_MARKERS,
  RECRUITER_OFFER_READINESS_PAGE_MARKER,
  resolveRecruiterOfferReadinessPreview,
} from "@/lib/recruiter-company-offer-readiness";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";

function PreviewBody({
  record,
  markers,
  pageMarker,
  personaTitleKey,
}: {
  record: OfferReadinessRecord;
  markers: typeof RECRUITER_OFFER_READINESS_MARKERS | typeof COMPANY_OFFER_READINESS_MARKERS;
  pageMarker: string;
  personaTitleKey: "offerReadinessPreview.recruiterPageTitle" | "offerReadinessPreview.companyPageTitle";
}) {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div data-testid={markers.page} data-recruiter-offer-readiness-page={pageMarker} className="mx-auto max-w-5xl space-y-6">
        <header data-testid={markers.header} className="space-y-2">
          <Link href={recruiterDailyCockpitHref()} className="twin-link text-sm">
            ← {t("offerReadinessPreview.linkDailyCockpit")}
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("offerReadinessPreview.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t(personaTitleKey)}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("offerReadinessPreview.headerLead")}</p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-testid={markers.sourceBadge}>
            {t(offerReadinessSourceKey(offerReadinessPreviewSource()))}
          </span>
          <span className="ml-2 inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("offerReadinessPreview.pilotBadge")}
          </span>
        </header>

        <div data-testid={markers.preview}>
          <OfferReadinessPanel record={record} />
          <div className="mt-6 space-y-6">
            <OfferReadinessChecklist items={record.checklist} />
            <OfferComparisonPreview rows={record.comparison_rows} />
          </div>
        </div>

        <Card variant="soft" className="p-5">
          <p className="text-xs text-[var(--twin-muted-strong)]">{t("offerReadinessPreview.readOnlyNote")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
              {t("offerReadinessPreview.actionSendOfferDisabled")}
            </button>
            <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
              {t("offerReadinessPreview.actionContractDisabled")}
            </button>
            <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
              {t("offerReadinessPreview.actionAtsDisabled")}
            </button>
          </div>
        </Card>

        <OfferCalendarReadinessCard candidateId={record.candidate_id} />

        <OfferReadinessEvidencePanel candidateId={record.candidate_id} />
      </div>
    </Shell>
  );
}

export function RecruiterOfferReadinessPreviewWorkspace(): ReactNode {
  const record = useMemo(() => resolveRecruiterOfferReadinessPreview(), []);
  if (!record) return null;
  return (
    <PreviewBody
      record={record}
      markers={RECRUITER_OFFER_READINESS_MARKERS}
      pageMarker={RECRUITER_OFFER_READINESS_PAGE_MARKER}
      personaTitleKey="offerReadinessPreview.recruiterPageTitle"
    />
  );
}

export function CompanyOfferReadinessPreviewWorkspace(): ReactNode {
  const record = useMemo(() => resolveRecruiterOfferReadinessPreview(), []);
  if (!record) return null;
  return (
    <PreviewBody
      record={record}
      markers={COMPANY_OFFER_READINESS_MARKERS}
      pageMarker={COMPANY_OFFER_READINESS_PAGE_MARKER}
      personaTitleKey="offerReadinessPreview.companyPageTitle"
    />
  );
}
