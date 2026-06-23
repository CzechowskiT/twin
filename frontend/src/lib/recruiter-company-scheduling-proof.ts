/** Recruiter & company scheduling proof panels — calendar readiness cross-links. */

import {
  getCompanySchedulingProofDemo,
  getRecruiterSchedulingProofDemo,
  type SchedulingProofRecord,
} from "@/lib/recruiter-company-scheduling-proof-demo-data";
import { CANDIDATE_CALENDAR_READINESS_ROUTE } from "@/lib/candidate-calendar-readiness";
import type { TranslationKey } from "@/lib/i18n";

export type { SchedulingProofRecord };

export const RECRUITER_SCHEDULING_PROOF_MARKER = "recruiter-daily-cockpit-scheduling-proof";
export const COMPANY_SCHEDULING_PROOF_MARKER = "company-hiring-command-center-scheduling-proof";

export const SCHEDULING_PROOF_LINKS = [
  {
    id: "candidate_readiness",
    href: CANDIDATE_CALENDAR_READINESS_ROUTE,
    labelKey: "schedulingProof.linkCandidateReadiness" as TranslationKey,
  },
  {
    id: "board_monitor",
    href: "/board/calendar-readiness",
    labelKey: "schedulingProof.linkBoardMonitor" as TranslationKey,
  },
] as const;

export function resolveRecruiterSchedulingProof(): SchedulingProofRecord {
  return getRecruiterSchedulingProofDemo();
}

export function resolveCompanySchedulingProof(): SchedulingProofRecord {
  return getCompanySchedulingProofDemo();
}
