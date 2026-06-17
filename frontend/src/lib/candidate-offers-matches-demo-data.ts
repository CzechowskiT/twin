/** Deterministic pilot match cards — sample only when live feed is empty. */

import type { DashboardMatchItem } from "@/components/dashboard/dashboard-helpers";

export const CANDIDATE_MATCHES_PAGE_MARKER = "candidate-matches-page";

export const CANDIDATE_OFFERS_PAGE_MARKER = "candidate-offers-page";

export const CANDIDATE_MATCHES_PILOT_ITEMS: DashboardMatchItem[] = [
  {
    job_id: 900001,
    score: 91,
    title: "Senior Backend Engineer (sample)",
    company: "SynthRail Logistics (pilot)",
    location: "Warszawa · hybrid",
    url: "https://example.com/pilot/sample-offer-900001",
    source_label: "pracuj.pl",
    job_board: "pracuj.pl",
    match_reason: "Python + FastAPI overlap with your profile signals — pilot card, not a live application.",
  },
  {
    job_id: 900002,
    score: 84,
    title: "Platform Engineer (sample)",
    company: "Helix Analytics (pilot)",
    location: "Remote · PL",
    url: "https://example.com/pilot/sample-offer-900002",
    source_label: "rocketjobs.pl",
    job_board: "rocketjobs.pl",
    match_reason: "Async pipelines and PostgreSQL — verify notice period before preparing a package.",
  },
];

export const CANDIDATE_MATCHES_PILOT_MISSING = [
  "Notice period not confirmed",
  "Compensation band not on file",
] as const;
