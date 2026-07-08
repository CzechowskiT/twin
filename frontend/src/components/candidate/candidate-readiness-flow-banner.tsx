"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { CANDIDATE_READINESS_HUB_HREF } from "@/lib/candidate-readiness-working-flow";
import type { TranslationKey } from "@/lib/i18n";

type BannerContext = "career_brief" | "skill_evidence";

const CONTEXT_KEYS: Record<BannerContext, TranslationKey> = {
  career_brief: "candidateReadinessWorkingFlow.bannerCareerBrief",
  skill_evidence: "candidateReadinessWorkingFlow.bannerSkillEvidence",
};

/** Cross-link from completion pages back to the dashboard readiness checklist. */
export function CandidateReadinessFlowBanner({ context }: { context: BannerContext }) {
  const { t } = useTranslation();

  return (
    <p
      className="mb-4 rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface-muted)]/30 px-3 py-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]"
      data-candidate-readiness-flow-banner={context}
    >
      <Link href={CANDIDATE_READINESS_HUB_HREF} className="twin-link font-medium">
        {t("candidateReadinessWorkingFlow.backToChecklist")}
      </Link>
      <span aria-hidden> — </span>
      {t(CONTEXT_KEYS[context])}
    </p>
  );
}
