/** Recruiter & company scheduling proof — demo checklist rows (read-only). */

export type SchedulingProofItem = {
  id: string;
  persona: "recruiter" | "company";
  label: string;
  status: "preview_only" | "blocked" | "ready";
  detail: string;
};

export type SchedulingProofRecord = {
  persona: "recruiter" | "company";
  headline: string;
  items: readonly SchedulingProofItem[];
  blocked_note: string;
};

const RECRUITER_ITEMS: SchedulingProofItem[] = [
  {
    id: "ms_env",
    persona: "recruiter",
    label: "Microsoft OAuth env flag",
    status: "preview_only",
    detail: "Check public-health microsoft_calendar_configured — env wiring only, not recruiter account link.",
  },
  {
    id: "candidate_readiness",
    persona: "recruiter",
    label: "Candidate readiness route",
    status: "ready",
    detail: "Link to /dashboard/calendar/readiness — candidate-side preview, no sync claims.",
  },
  {
    id: "graph_write",
    persona: "recruiter",
    label: "Graph event write",
    status: "blocked",
    detail: "Blocked — recruiter calendar sync and invite dispatch not live in readiness batch.",
  },
];

const COMPANY_ITEMS: SchedulingProofItem[] = [
  {
    id: "ms_env",
    persona: "company",
    label: "Microsoft OAuth env flag",
    status: "preview_only",
    detail: "Check public-health microsoft_calendar_configured — enterprise pilot env preview only.",
  },
  {
    id: "panel_pack",
    persona: "company",
    label: "Panel interview pack readiness",
    status: "preview_only",
    detail: "Meeting readiness rows remain demo — scheduling proof preview, not live holds.",
  },
  {
    id: "invite_dispatch",
    persona: "company",
    label: "Interview invite dispatch",
    status: "blocked",
    detail: "Blocked — no outbound invite or notification claims in readiness slice.",
  },
];

export function getRecruiterSchedulingProofDemo(): SchedulingProofRecord {
  return {
    persona: "recruiter",
    headline: "Recruiter scheduling proof preview — Microsoft Graph readiness, no live sync.",
    items: RECRUITER_ITEMS,
    blocked_note: "Readiness preview only — no calendar sync, no event create/update/delete, no invites.",
  };
}

export function getCompanySchedulingProofDemo(): SchedulingProofRecord {
  return {
    persona: "company",
    headline: "Company scheduling proof preview — hiring panel holds remain demo-only.",
    items: COMPANY_ITEMS,
    blocked_note: "Readiness preview only — no calendar sync, no event create/update/delete, no invites.",
  };
}
