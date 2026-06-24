"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  capabilityStatusKey,
  OPERATING_EVIDENCE_MARKERS,
  type CapabilityRow,
} from "@/lib/operating-evidence";

type Props = {
  rows: readonly CapabilityRow[];
  testId?: string;
};

export function ReadOnlyCapabilityMatrix({ rows, testId }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto" data-testid={testId ?? OPERATING_EVIDENCE_MARKERS.capabilityMatrix}>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--twin-border)]/60 text-[var(--twin-muted)]">
            <th className="py-1 pr-2">{t("operatingEvidence.colCapability")}</th>
            <th className="py-1 pr-2">{t("operatingEvidence.colDetail")}</th>
            <th className="py-1">{t("operatingEvidence.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
              <td className="py-1 pr-2 font-medium">{t(row.labelKey)}</td>
              <td className="py-1 pr-2 text-[var(--twin-muted-strong)]">{t(row.detailKey)}</td>
              <td className="py-1 uppercase text-[var(--twin-accent)]">{t(capabilityStatusKey(row.status))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
