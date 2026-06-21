"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { PlacementEventsTimeline } from "@/components/shared/placement-events-timeline";
import { Card, Shell } from "@/components/ui";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { PlacementChecklistItem, PlacementChecklistRecord } from "@/lib/recruiter-company-placement-verification-checklist-demo-data";
import {
  checklistSource,
  placementVerificationSourceKey,
  RECRUITER_PLACEMENT_VERIFICATION_MARKERS,
  RECRUITER_PLACEMENT_VERIFICATION_PAGE_MARKER,
  resolveRecruiterPlacementChecklist,
} from "@/lib/recruiter-company-placement-verification-checklist";
import { recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import type { TranslationKey } from "@/lib/i18n";

function statusLabelKey(status: PlacementChecklistItem["status"]): TranslationKey {
  const map: Record<PlacementChecklistItem["status"], TranslationKey> = {
    done: "placementChecklist.statusDone",
    pending: "placementChecklist.statusPending",
    blocked: "placementChecklist.statusBlocked",
    not_applicable: "placementChecklist.statusNotApplicable",
  };
  return map[status];
}

function ChecklistBody({
  record,
  markers,
  pageMarker,
  personaLabelKey,
}: {
  record: PlacementChecklistRecord;
  markers: typeof RECRUITER_PLACEMENT_VERIFICATION_MARKERS;
  pageMarker: string;
  personaLabelKey: TranslationKey;
}) {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div data-testid={markers.page} data-recruiter-placement-verification-page={pageMarker} className="mx-auto max-w-5xl space-y-6">
        <header data-testid={markers.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("placementChecklist.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t(personaLabelKey)}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("placementChecklist.headerLead")}</p>
          <p className="font-mono text-xs text-[var(--twin-muted)]">
            {record.placement_id} · {record.role_title} · {record.company_slug}
          </p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-testid={markers.sourceBadge}>
            {t(placementVerificationSourceKey(checklistSource()))}
          </span>
          <span className="ml-2 inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("placementChecklist.pilotBadge")}
          </span>
        </header>

        <Card variant="soft" className="p-5" data-testid={markers.checklist}>
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("placementChecklist.checklistTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("placementChecklist.checklistLead")}</p>
          <ul className="mt-4 space-y-3">
            {record.items.map((item) => (
              <li key={item.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t(item.labelKey)}</span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                    {t(statusLabelKey(item.status))}
                  </span>
                </div>
                <p className="mt-1 text-[var(--twin-muted)]">{t(item.detailKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="soft" className="p-5" data-testid={markers.disabledActions}>
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("placementChecklist.disabledActionsTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("placementChecklist.disabledActionsLead")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.disabled_actions.map((action) => (
              <button key={action.id} type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        </Card>

        <PlacementEventsTimeline placementId={record.placement_id} />

        <div data-testid={markers.crossLinks}>
          <OperationalCrossLinksPanel />
          <Link href={recruiterDailyCockpitHref()} className="twin-link mt-4 inline-block text-xs">
            ← {t("recruiterDailyCockpit.openDailyCockpit")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}

export function RecruiterPlacementVerificationChecklistWorkspace() {
  const record = resolveRecruiterPlacementChecklist();
  return (
    <ChecklistBody
      record={record}
      markers={RECRUITER_PLACEMENT_VERIFICATION_MARKERS}
      pageMarker={RECRUITER_PLACEMENT_VERIFICATION_PAGE_MARKER}
      personaLabelKey="placementChecklist.recruiterPageTitle"
    />
  );
}
