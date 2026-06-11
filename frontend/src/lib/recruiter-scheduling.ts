/** Manual recruiter interview scheduling — copy-only invites, no calendar sync. */

import type { Locale } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { normalizeRecruiterInboxStatus } from "@/lib/recruiter-inbox-decision";
import { extractCandidateFirstName } from "@/lib/recruiter-message-drafts";

export const RECRUITER_SCHEDULING_VISUAL_MARKERS = {
  prepareButton: "recruiter-scheduling-prepare-btn",
  panel: "recruiter-scheduling-panel",
  notSyncedBanner: "recruiter-scheduling-not-synced",
  notSentBanner: "recruiter-scheduling-not-sent",
  copyButton: "recruiter-scheduling-copy-btn",
  slotDate: "recruiter-scheduling-slot-date",
  slotTime: "recruiter-scheduling-slot-time",
  slotDuration: "recruiter-scheduling-slot-duration",
  meetingLink: "recruiter-scheduling-meeting-link",
  scheduledBadge: "recruiter-scheduling-scheduled-badge",
  calendarSyncNote: "recruiter-scheduling-calendar-sync-note",
} as const;

export type RecruiterSchedulingStatus = "invited" | "interview_scheduled";

export type RecruiterSchedulingRow = {
  application_id: number;
  candidate_name: string;
  job_title: string;
  company: string;
  status: string;
  pipeline_status?: string | null;
  scheduling_status?: string | null;
  manual_slot_at?: string | null;
  manual_slot_duration_minutes?: number | null;
  manual_meeting_link?: string | null;
};

export type RecruiterManualSlotInput = {
  slotDate: string;
  slotTime: string;
  durationMinutes: number;
  meetingLink: string;
};

const SCHEDULING_ELIGIBLE_PIPELINE = new Set(["accepted", "to_contact", "invited"]);

/** Accepted / to-contact pipeline rows only. */
export function isRecruiterSchedulingEligible(row: Pick<RecruiterSchedulingRow, "status" | "pipeline_status">): boolean {
  const pipeline = (row.pipeline_status ?? "").trim().toLowerCase();
  if (pipeline && SCHEDULING_ELIGIBLE_PIPELINE.has(pipeline)) return true;
  const legacy = normalizeRecruiterInboxStatus(row.status);
  return legacy === "interview" || legacy === "to_contact";
}

export function defaultManualSlotInput(): RecruiterManualSlotInput {
  return {
    slotDate: "",
    slotTime: "",
    durationMinutes: 45,
    meetingLink: "",
  };
}

function applyInviteTokens(template: string, tokens: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function buildRecruiterInviteMessage(
  row: Pick<RecruiterSchedulingRow, "candidate_name" | "job_title" | "company">,
  slot: RecruiterManualSlotInput,
  locale: Locale,
): string {
  const copy = dictionaries[locale].recruiterScheduling;
  const firstName = extractCandidateFirstName(row.candidate_name);
  const greetingName = firstName ? ` ${firstName}` : "";
  const linkLine = slot.meetingLink.trim()
    ? applyInviteTokens(copy.inviteLinkLine, { meetingLink: slot.meetingLink.trim() })
    : "";
  return applyInviteTokens(copy.inviteBodyTemplate, {
    candidateName: greetingName,
    role: row.job_title.trim(),
    company: row.company.trim(),
    date: slot.slotDate.trim(),
    time: slot.slotTime.trim(),
    duration: String(slot.durationMinutes),
    meetingLink: linkLine,
  }).replace(/\n{3,}/g, "\n\n").trim();
}

export function formatScheduledSlotDisplay(
  manualSlotAt: string | null | undefined,
  durationMinutes: number | null | undefined,
  locale: Locale,
): string | null {
  if (!manualSlotAt) return null;
  const parsed = new Date(manualSlotAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const dateFmt = new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const base = dateFmt.format(parsed);
  if (durationMinutes && durationMinutes > 0) {
    const mins = dictionaries[locale].recruiterScheduling.durationMinutesSuffix.replace(
      "{minutes}",
      String(durationMinutes),
    );
    return `${base} · ${mins}`;
  }
  return base;
}

export function recruiterSchedulingStatusLabelKey(
  status: string | null | undefined,
): "statusInvited" | "statusInterviewScheduled" | null {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "invited") return "statusInvited";
  if (s === "interview_scheduled") return "statusInterviewScheduled";
  return null;
}

const FORBIDDEN_SCHEDULING_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\+?\d[\d\s().-]{7,}\d\b/,
];

export function recruiterSchedulingInviteIsSafe(text: string): boolean {
  const blob = text.trim();
  if (!blob) return true;
  return !FORBIDDEN_SCHEDULING_PATTERNS.some((pattern) => pattern.test(blob));
}
