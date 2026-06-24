"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperatingEvidencePanel } from "@/components/shared/operating-evidence-panel";
import { ReadOnlyCapabilityMatrix } from "@/components/shared/read-only-capability-matrix";
import {
  PLACEMENT_VERIFICATION_EVIDENCE_CROSS_LINKS,
  PLACEMENT_VERIFICATION_EVIDENCE_MARKERS,
  resolvePlacementVerificationEvidence,
} from "@/lib/placement-verification-evidence";

type Props = {
  placementId?: string;
};

export function PlacementVerificationEvidencePanel({ placementId }: Props): ReactNode {
  const { t } = useTranslation();
  const bundle = resolvePlacementVerificationEvidence(placementId);

  return (
    <OperatingEvidencePanel
      titleKey="placementVerificationEvidence.panelTitle"
      leadKey="placementVerificationEvidence.panelLead"
      boundaryKey="placementVerificationEvidence.boundaryNote"
      snapshot={bundle?.snapshot ?? null}
      crossLinks={PLACEMENT_VERIFICATION_EVIDENCE_CROSS_LINKS}
      testId={PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.panel}
    >
      {bundle ? (
        <>
          <div data-testid={PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.statusSummary}>
            <p className="text-xs font-medium">{bundle.record.headline}</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--twin-muted)]">{bundle.record.placement_id}</p>
          </div>

          <div data-testid={PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.evidenceBundle}>
            <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("placementVerificationEvidence.evidenceBundleTitle")}
            </p>
            <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
              {t("placementVerificationEvidence.evidenceBundleLead").replace(
                "{count}",
                String(bundle.record.evidence_items.length),
              )}
            </p>
            <ul className="mt-2 space-y-1">
              {bundle.record.evidence_items.map((item) => (
                <li key={item.id} className="rounded border border-[var(--twin-border)]/60 px-2 py-1 text-[10px]">
                  {item.label} · {item.status}
                </li>
              ))}
            </ul>
          </div>

          <ReadOnlyCapabilityMatrix rows={bundle.capabilities} />

          <p
            className="font-mono text-[10px] text-[var(--twin-muted)]"
            data-testid={PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.timelineNote}
          >
            {t("placementVerificationEvidence.timelineEndpoint")}: {bundle.timeline_endpoint}
          </p>
        </>
      ) : null}
    </OperatingEvidencePanel>
  );
}
