"use client";

import { useCallback, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  buildDigestCopyText,
  type TalentRadarDigestPayload,
} from "@/lib/recruiter-talent-radar-digest";

export function TalentRadarDigestCopyButton({ payload }: { payload: TalentRadarDigestPayload }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = buildDigestCopyText(payload);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }, [payload]);

  return (
    <button
      type="button"
      className={copied ? "twin-btn-outline text-sm" : "twin-btn-solid text-sm"}
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.copyButton}
      aria-live="polite"
      onClick={() => void handleCopy()}
    >
      {copied ? t("recruiterTalentRadarDigest.summaryCopiedShort") : t("recruiterTalentRadarDigest.copySummary")}
    </button>
  );
}
