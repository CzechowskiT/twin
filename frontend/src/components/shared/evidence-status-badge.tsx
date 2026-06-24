"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  operatingEvidenceSourceKey,
  OPERATING_EVIDENCE_MARKERS,
  type OperatingEvidenceSource,
} from "@/lib/operating-evidence";

type Props = {
  source: OperatingEvidenceSource;
  testId?: string;
};

export function EvidenceStatusBadge({ source, testId }: Props): ReactNode {
  const { t } = useTranslation();
  return (
    <span
      className="inline-block rounded-full border px-3 py-1 text-xs"
      data-testid={testId ?? OPERATING_EVIDENCE_MARKERS.sourceBadge}
    >
      {t(operatingEvidenceSourceKey(source))}
    </span>
  );
}
