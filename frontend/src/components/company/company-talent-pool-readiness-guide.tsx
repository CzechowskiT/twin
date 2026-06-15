"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card } from "@/components/ui";
import {
  COMPANY_TALENT_POOL_MARKERS,
  type CompanyTalentPoolReadinessState,
} from "@/lib/company-talent-pool";

const READINESS_GUIDE_STATES: CompanyTalentPoolReadinessState[] = [
  "ready",
  "needs_enrichment",
  "consent_required",
  "duplicate_review",
  "stale",
];

const STATE_LABEL_KEYS: Record<CompanyTalentPoolReadinessState, TranslationKey> = {
  ready: "companyTalentPool.readinessReady",
  needs_enrichment: "companyTalentPool.readinessNeedsEnrichment",
  duplicate_review: "companyTalentPool.readinessDuplicateReview",
  consent_required: "companyTalentPool.readinessConsentRequired",
  stale: "companyTalentPool.readinessStale",
};

const STATE_BODY_KEYS: Record<CompanyTalentPoolReadinessState, TranslationKey> = {
  ready: "companyTalentPool.readinessGuideReadyBody",
  needs_enrichment: "companyTalentPool.readinessGuideNeedsEnrichmentBody",
  duplicate_review: "companyTalentPool.readinessGuideDuplicateReviewBody",
  consent_required: "companyTalentPool.readinessGuideConsentRequiredBody",
  stale: "companyTalentPool.readinessGuideStaleBody",
};

type CompanyTalentPoolReadinessGuideProps = {
  importHref: string;
  recruiterPoolHref: string;
  integrationsHref: string;
};

export function CompanyTalentPoolReadinessGuide({
  importHref,
  recruiterPoolHref,
  integrationsHref,
}: CompanyTalentPoolReadinessGuideProps) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5"
      data-testid={COMPANY_TALENT_POOL_MARKERS.readinessGuide}
    >
      <h3 className="text-sm font-semibold">{t("companyTalentPool.readinessGuideTitle")}</h3>
      <p className="twin-muted mt-1 text-xs leading-relaxed">{t("companyTalentPool.readinessGuideLead")}</p>
      <ul className="mt-4 space-y-3">
        {READINESS_GUIDE_STATES.map((state) => (
          <li key={state} className="rounded-lg border border-[var(--twin-border)]/50 bg-[var(--twin-surface-soft)]/40 p-3">
            <p className="text-sm font-medium">{t(STATE_LABEL_KEYS[state])}</p>
            <p className="twin-muted mt-1 text-xs leading-relaxed">{t(STATE_BODY_KEYS[state])}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <Link href={importHref} className="twin-link font-medium">
          {t("companyTalentPool.readinessActionEnrichImport")}
        </Link>
        <Link href={recruiterPoolHref} className="twin-link font-medium">
          {t("companyTalentPool.readinessActionAskRecruiter")}
        </Link>
        <Link href={recruiterPoolHref} className="twin-link font-medium">
          {t("companyTalentPool.readinessActionReviewDuplicates")}
        </Link>
        <Link href={integrationsHref} className="twin-link font-medium">
          {t("companyTalentPool.readinessActionOpenIntegrations")}
        </Link>
      </div>
    </Card>
  );
}
