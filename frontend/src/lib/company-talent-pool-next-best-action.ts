import type { TranslationKey } from "@/lib/i18n";
import type { CompanyTalentPoolPayload } from "@/lib/company-talent-pool";

export type CompanyTalentPoolNextBestActionCode =
  | "import"
  | "enrich"
  | "review_duplicates"
  | "ask_recruiter"
  | "open_radar";

export type CompanyTalentPoolNextBestAction = {
  code: CompanyTalentPoolNextBestActionCode;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  href: string;
  ctaKey: TranslationKey;
};

/**
 * Deterministic next step from existing pool payload — no LLM, no invented metrics.
 * Priority: empty → duplicates → missing skills → radar-ready → healthy radar.
 */
export function resolveCompanyTalentPoolNextBestAction(
  payload: CompanyTalentPoolPayload,
): CompanyTalentPoolNextBestAction {
  const summary = payload.executive_summary;
  const dims = payload.data_quality.dimensions;
  const known = summary.known_candidates;
  const duplicates = summary.potential_duplicates || (dims.duplicates ?? 0);
  const missingSkills = dims.missing_skills ?? 0;

  if (known === 0 && payload.items.length === 0) {
    return {
      code: "import",
      titleKey: "companyTalentPool.nbaImportTitle",
      bodyKey: "companyTalentPool.nbaImportBody",
      href: payload.links.recruiter_import,
      ctaKey: "companyTalentPool.nbaImportCta",
    };
  }
  if (duplicates > 0) {
    return {
      code: "review_duplicates",
      titleKey: "companyTalentPool.nbaDuplicatesTitle",
      bodyKey: "companyTalentPool.nbaDuplicatesBody",
      href: payload.links.recruiter_pool,
      ctaKey: "companyTalentPool.nbaDuplicatesCta",
    };
  }
  if (missingSkills > 0) {
    return {
      code: "enrich",
      titleKey: "companyTalentPool.nbaEnrichTitle",
      bodyKey: "companyTalentPool.nbaEnrichBody",
      href: payload.links.recruiter_import,
      ctaKey: "companyTalentPool.nbaEnrichCta",
    };
  }
  if (summary.radar_ready > 0) {
    return {
      code: "ask_recruiter",
      titleKey: "companyTalentPool.nbaAskRecruiterTitle",
      bodyKey: "companyTalentPool.nbaAskRecruiterBody",
      href: payload.links.recruiter_pool,
      ctaKey: "companyTalentPool.nbaAskRecruiterCta",
    };
  }
  return {
    code: "open_radar",
    titleKey: "companyTalentPool.nbaOpenRadarTitle",
    bodyKey: "companyTalentPool.nbaOpenRadarBody",
    href: payload.links.talent_radar,
    ctaKey: "companyTalentPool.nbaOpenRadarCta",
  };
}
