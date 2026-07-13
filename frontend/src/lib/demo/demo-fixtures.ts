/**
 * Deterministic demo fixtures — fictional entities, no PII, no API mutations.
 */
import {
  DEMO_CALENDAR_SLOT,
  DEMO_CV_META,
  DEMO_INBOX_CANDIDATE,
  DEMO_REVIEW_CARD,
  DEMO_WALKTHROUGH_JOBS,
} from "@/lib/demo-walkthrough-data";

export const DEMO_FAKE_CANDIDATE = {
  id: "demo-candidate-001",
  displayName: "Alex Kowalski",
  title: "Senior Fullstack Developer",
  location: "Warszawa · hybrid",
  pilotLabel: true,
} as const;

export const DEMO_FAKE_RECRUITER = {
  id: "demo-recruiter-001",
  displayName: "Marta Nowak",
  workspace: "SynthRail Talent",
} as const;

export const DEMO_FAKE_COMPANY = {
  id: "demo-company-001",
  name: "SynthRail Logistics SA",
  talentMemoryRoles: 12,
  activePipelines: 3,
} as const;

export const DEMO_FIXTURE_BUNDLE = {
  candidate: DEMO_FAKE_CANDIDATE,
  recruiter: DEMO_FAKE_RECRUITER,
  company: DEMO_FAKE_COMPANY,
  topJobs: DEMO_WALKTHROUGH_JOBS.filter((j) => j.inTop20).slice(0, 3),
  inboxCandidate: DEMO_INBOX_CANDIDATE,
  reviewCard: DEMO_REVIEW_CARD,
  calendarSlot: DEMO_CALENDAR_SLOT,
  cvMeta: DEMO_CV_META,
} as const;
