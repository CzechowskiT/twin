/**
 * Epic 2.11 — Actionable empty-state registry tied to 7-area IA.
 * loading/error ≠ empty; positive empty OK.
 */

import type { TranslationKey } from "@/lib/i18n";

export type EmptyDisposition = "actionable" | "positive_empty";

export type ActionableEmptyConfig = {
  areaId: string;
  disposition: EmptyDisposition;
  href: string;
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  stepKeys: TranslationKey[];
  ctaKey: TranslationKey;
  positiveEmptyOk: true;
  loadingEqualsEmpty: false;
  errorEqualsEmpty: false;
};

export const ACTIONABLE_EMPTY_STATES: Record<string, ActionableEmptyConfig> = {
  home: {
    areaId: "home",
    disposition: "actionable",
    href: "/dashboard",
    titleKey: "guidedFv.emptyHomeTitle",
    messageKey: "guidedFv.emptyHomeMsg",
    stepKeys: ["guidedFv.emptyHomeStep1", "guidedFv.emptyHomeStep2", "guidedFv.emptyHomeStep3"],
    ctaKey: "guidedFv.emptyHomeCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  direction: {
    areaId: "direction",
    disposition: "actionable",
    href: "/dashboard/career",
    titleKey: "guidedFv.emptyDirectionTitle",
    messageKey: "guidedFv.emptyDirectionMsg",
    stepKeys: [
      "guidedFv.emptyDirectionStep1",
      "guidedFv.emptyDirectionStep2",
      "guidedFv.emptyDirectionStep3",
    ],
    ctaKey: "guidedFv.emptyDirectionCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  opportunities: {
    areaId: "opportunities",
    disposition: "actionable",
    href: "/dashboard/matches",
    titleKey: "guidedFv.emptyOpportunitiesTitle",
    messageKey: "guidedFv.emptyOpportunitiesMsg",
    stepKeys: [
      "guidedFv.emptyOpportunitiesStep1",
      "guidedFv.emptyOpportunitiesStep2",
      "guidedFv.emptyOpportunitiesStep3",
    ],
    ctaKey: "guidedFv.emptyOpportunitiesCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  evidence: {
    areaId: "evidence",
    disposition: "actionable",
    href: "/dashboard/portfolio",
    titleKey: "guidedFv.emptyEvidenceTitle",
    messageKey: "guidedFv.emptyEvidenceMsg",
    stepKeys: [
      "guidedFv.emptyEvidenceStep1",
      "guidedFv.emptyEvidenceStep2",
      "guidedFv.emptyEvidenceStep3",
    ],
    ctaKey: "guidedFv.emptyEvidenceCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  plan: {
    areaId: "plan",
    disposition: "actionable",
    href: "/dashboard/execution-calendar",
    titleKey: "guidedFv.emptyPlanTitle",
    messageKey: "guidedFv.emptyPlanMsg",
    stepKeys: ["guidedFv.emptyPlanStep1", "guidedFv.emptyPlanStep2", "guidedFv.emptyPlanStep3"],
    ctaKey: "guidedFv.emptyPlanCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  decisions: {
    areaId: "decisions",
    disposition: "positive_empty",
    href: "/dashboard",
    titleKey: "guidedFv.emptyDecisionsTitle",
    messageKey: "guidedFv.emptyDecisionsMsg",
    stepKeys: [],
    ctaKey: "guidedFv.emptyDecisionsCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
  settings: {
    areaId: "settings",
    disposition: "actionable",
    href: "/dashboard/privacy-center",
    titleKey: "guidedFv.emptySettingsTitle",
    messageKey: "guidedFv.emptySettingsMsg",
    stepKeys: [],
    ctaKey: "guidedFv.emptySettingsCta",
    positiveEmptyOk: true,
    loadingEqualsEmpty: false,
    errorEqualsEmpty: false,
  },
};

export const EMPTY_STATE_CONTRACT = {
  id: "actionable_empty_state_v1",
  applicable: Object.keys(ACTIONABLE_EMPTY_STATES),
  complete: Object.keys(ACTIONABLE_EMPTY_STATES).length,
  loadingEqualsEmpty: false,
  errorEqualsEmpty: false,
  positiveEmptyOk: true,
} as const;
