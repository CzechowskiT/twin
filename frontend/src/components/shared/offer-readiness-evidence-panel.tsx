"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperatingEvidencePanel } from "@/components/shared/operating-evidence-panel";
import { ReadOnlyCapabilityMatrix } from "@/components/shared/read-only-capability-matrix";
import {
  OFFER_READINESS_EVIDENCE_CROSS_LINKS,
  OFFER_READINESS_EVIDENCE_MARKERS,
  resolveOfferReadinessEvidence,
} from "@/lib/offer-readiness-evidence";

type Props = {
  candidateId?: string;
};

export function OfferReadinessEvidencePanel({ candidateId }: Props): ReactNode {
  const { t } = useTranslation();
  const bundle = resolveOfferReadinessEvidence(candidateId);

  return (
    <OperatingEvidencePanel
      titleKey="offerReadinessEvidence.panelTitle"
      leadKey="offerReadinessEvidence.panelLead"
      boundaryKey="offerReadinessEvidence.boundaryNote"
      snapshot={bundle?.snapshot ?? null}
      crossLinks={OFFER_READINESS_EVIDENCE_CROSS_LINKS}
      testId={OFFER_READINESS_EVIDENCE_MARKERS.panel}
    >
      {bundle ? (
        <>
          <div data-testid={OFFER_READINESS_EVIDENCE_MARKERS.statusSummary}>
            <p className="text-xs font-medium">{bundle.record.headline}</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--twin-muted)]">
              {bundle.record.candidate_id} · {bundle.record.role_id}
            </p>
          </div>

          <div data-testid={OFFER_READINESS_EVIDENCE_MARKERS.checklistSummary}>
            <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("offerReadinessEvidence.checklistSummaryTitle")}
            </p>
            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
              {t("offerReadinessEvidence.checklistSummaryLead").replace(
                "{done}",
                String(bundle.record.checklist.filter((i) => i.status === "done").length),
              ).replace("{total}", String(bundle.record.checklist.length))}
            </p>
          </div>

          <ReadOnlyCapabilityMatrix
            rows={bundle.capabilities}
            testId={OFFER_READINESS_EVIDENCE_MARKERS.capabilityMatrix}
          />
        </>
      ) : null}
    </OperatingEvidencePanel>
  );
}
