/** Placement verification integration — cross-surface route map for evidence slice. */

import { BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE } from "@/lib/board-placement-evidence-monitor";
import {
  COMPANY_PLACEMENT_VERIFICATION_ROUTE,
  RECRUITER_PLACEMENT_VERIFICATION_ROUTE,
} from "@/lib/recruiter-company-placement-verification-checklist";
import type { TranslationKey } from "@/lib/i18n";

export const CANDIDATE_PLACEMENT_VERIFICATION_ROUTE = "/dashboard/placement-verification";

export const PLACEMENT_VERIFICATION_INTEGRATION_DOC = "docs/PLACEMENT_VERIFICATION_2026-06-21.md";

export const PLACEMENT_VERIFICATION_INTEGRATION_LINKS = [
  {
    id: "candidate_preview",
    href: CANDIDATE_PLACEMENT_VERIFICATION_ROUTE,
    labelKey: "candidatePlacementVerification.pageTitle" as TranslationKey,
    surface: "candidate_trust_overview",
  },
  {
    id: "recruiter_checklist",
    href: RECRUITER_PLACEMENT_VERIFICATION_ROUTE,
    labelKey: "placementChecklist.recruiterPageTitle" as TranslationKey,
    surface: "recruiter_daily_cockpit",
  },
  {
    id: "company_checklist",
    href: COMPANY_PLACEMENT_VERIFICATION_ROUTE,
    labelKey: "placementChecklist.companyPageTitle" as TranslationKey,
    surface: "company_command_center",
  },
  {
    id: "board_monitor",
    href: BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE,
    labelKey: "boardPlacementEvidence.pageTitle" as TranslationKey,
    surface: "board",
  },
  {
    id: "investor_placement",
    href: "/investor/placement",
    labelKey: "placementDemo.title" as TranslationKey,
    surface: "investor",
  },
] as const;

export function placementVerificationIntegrationHref(
  id: (typeof PLACEMENT_VERIFICATION_INTEGRATION_LINKS)[number]["id"],
): string {
  const link = PLACEMENT_VERIFICATION_INTEGRATION_LINKS.find((row) => row.id === id);
  return link?.href ?? CANDIDATE_PLACEMENT_VERIFICATION_ROUTE;
}
