/** Deterministic pilot Candidate Profile 360 — sample only, no real PII. */

import { TWIN_DEMO_CANDIDATE_PRIMARY_ID } from "@/lib/system-of-record-domain/constants";

export const CANDIDATE_PROFILE_360_DEMO_ID = TWIN_DEMO_CANDIDATE_PRIMARY_ID;

export type CandidateProfile360BackTarget = "talent_radar" | "talent_pool" | "inbox";

export type CandidateProfile360Experience = {
  title: string;
  company: string;
  period: string;
};

export type CandidateProfile360EvidenceLink = {
  label: string;
  href: string;
  kind: "portfolio" | "reference" | "certification";
  sampleOnly: true;
};

export type CandidateProfile360Application = {
  role_title: string;
  company: string;
  pipeline_stage: string;
  match_score: number;
  status_note: string;
};

export type CandidateProfile360Match = {
  role_title: string;
  company: string;
  match_score: number;
  why_matched: string[];
  missing_info: string[];
  recruiter_decision_required: true;
};

export type CandidateProfile360DecisionEvent = {
  action: "shortlisted" | "snoozed" | "dismissed" | "draft_prepared" | "reviewed";
  at: string;
  actor: string;
  note?: string;
};

export type CandidateProfile360ActivityEvent = {
  type: "imported" | "matched" | "reviewed" | "note" | "digest";
  at: string;
  summary: string;
};

export type CandidateProfile360Record = {
  id: string;
  display_name: string;
  headline: string;
  role_fit_title: string;
  fit_label: "strong" | "good" | "possible" | "weak";
  fit_score: number;
  status: "ready_to_review" | "needs_verification" | "consent_check_required";
  trust_label: string;
  consent_verified: boolean;
  last_activity: string;
  back_target: CandidateProfile360BackTarget;
  strengths: string[];
  risks: string[];
  ai_draft_summary: string;
  cv_status: string;
  experience: CandidateProfile360Experience[];
  skills: string[];
  evidence_links: CandidateProfile360EvidenceLink[];
  applications: CandidateProfile360Application[];
  matches: CandidateProfile360Match[];
  consent_status: string;
  consent_source: string;
  consent_last_contact: string;
  consent_allowed_use: string[];
  consent_requires_review: boolean;
  decision_state: "shortlisted" | "snoozed" | "dismissed" | "draft" | "active";
  decision_events: CandidateProfile360DecisionEvent[];
  activity_events: CandidateProfile360ActivityEvent[];
  pilot_labelled: true;
};

const DEMO_CANDIDATE_PROFILE_360: CandidateProfile360Record = {
  id: CANDIDATE_PROFILE_360_DEMO_ID,
  display_name: "Alex K. (sample)",
  headline: "Senior Backend Engineer · Python / FastAPI · pilot profile",
  role_fit_title: "Senior Backend Engineer — SynthRail Logistics",
  fit_label: "strong",
  fit_score: 88,
  status: "ready_to_review",
  trust_label: "Consent on file · workspace-scoped",
  consent_verified: true,
  last_activity: "2026-06-14T09:30:00Z",
  back_target: "talent_radar",
  strengths: [
    "Python + FastAPI overlap with role bar — sample signal, not a hiring decision.",
    "PostgreSQL and async pipelines cited in imported talent pool row.",
    "Prior shortlist on similar logistics platform role (internal memory).",
  ],
  risks: [
    "Notice period not confirmed — verify before scheduling.",
    "Compensation band missing from imported row.",
  ],
  ai_draft_summary:
    "Pilot AI draft: strong backend fit on stack overlap; recruiter should confirm notice period and compensation before outreach. Not auto-sent.",
  cv_status: "Imported summary on file — full CV vault review in recruiter inbox when live.",
  experience: [
    {
      title: "Backend Engineer (sample)",
      company: "Helix Analytics (pilot)",
      period: "2021 — present",
    },
    {
      title: "Software Developer (sample)",
      company: "Nova Systems (pilot)",
      period: "2018 — 2021",
    },
  ],
  skills: ["Python", "FastAPI", "PostgreSQL", "Celery", "Docker", "API design"],
  evidence_links: [
    {
      label: "Portfolio case study (sample reference)",
      href: "https://example.com/pilot/sample-portfolio-demo-candidate-001",
      kind: "portfolio",
      sampleOnly: true,
    },
    {
      label: "Internal import row (no download)",
      href: "https://example.com/pilot/sample-import-row-demo-candidate-001",
      kind: "reference",
      sampleOnly: true,
    },
  ],
  applications: [
    {
      role_title: "Senior Backend Engineer",
      company: "SynthRail Logistics (pilot)",
      pipeline_stage: "Talent Radar — ready to review",
      match_score: 88,
      status_note: "No accept/decline recorded — recruiter decision pending.",
    },
    {
      role_title: "Platform Engineer",
      company: "Helix Analytics (pilot)",
      pipeline_stage: "Previously snoozed",
      match_score: 79,
      status_note: "Snooze expired — resurfaced in radar; not a live ATS stage.",
    },
  ],
  matches: [
    {
      role_title: "Senior Backend Engineer",
      company: "SynthRail Logistics (pilot)",
      match_score: 88,
      why_matched: [
        "Stack overlap: Python, FastAPI, PostgreSQL.",
        "Location fit: Warszawa hybrid within imported preferences.",
      ],
      missing_info: ["Notice period", "Salary expectations"],
      recruiter_decision_required: true,
    },
    {
      role_title: "Staff Platform Engineer",
      company: "Orbit Freight (pilot)",
      match_score: 72,
      why_matched: ["Async job pipelines experience cited in pool import."],
      missing_info: ["Staff-level scope confirmation", "On-site cadence"],
      recruiter_decision_required: true,
    },
  ],
  consent_status: "Active — workspace import with recruiter attestation",
  consent_source: "Talent Pool CSV import (pilot) + candidate workspace opt-in sample",
  consent_last_contact: "2026-06-10",
  consent_allowed_use: [
    "Internal recruiter review within company workspace",
    "Ranked matching and Talent Radar resurfacing",
    "Manual outreach draft preparation (copy-only)",
  ],
  consent_requires_review: false,
  decision_state: "draft",
  decision_events: [
    {
      action: "draft_prepared",
      at: "2026-06-14T09:15:00Z",
      actor: "Recruiter (sample)",
      note: "Outreach draft prepared — not sent.",
    },
    {
      action: "reviewed",
      at: "2026-06-12T14:00:00Z",
      actor: "Recruiter (sample)",
    },
    {
      action: "shortlisted",
      at: "2026-06-08T11:30:00Z",
      actor: "Recruiter (sample)",
      note: "Prior shortlist on related role — decision memory resurfaced.",
    },
  ],
  activity_events: [
    {
      type: "imported",
      at: "2026-06-05T10:00:00Z",
      summary: "Imported via Talent Pool CSV (pilot row).",
    },
    {
      type: "matched",
      at: "2026-06-07T08:20:00Z",
      summary: "Matched to Senior Backend Engineer — SynthRail Logistics.",
    },
    {
      type: "reviewed",
      at: "2026-06-12T14:00:00Z",
      summary: "Recruiter opened review context in inbox.",
    },
    {
      type: "digest",
      at: "2026-06-14T07:00:00Z",
      summary: "Surfaced in weekly Talent Radar digest — recruiter decides next action.",
    },
  ],
  pilot_labelled: true,
};

export function getCandidateProfile360Demo(): CandidateProfile360Record {
  return DEMO_CANDIDATE_PROFILE_360;
}
