/** Recruiter pipeline — types, filters, scheduled slot display. */

import type { Locale } from "@/lib/i18n";
import { formatScheduledSlotDisplay } from "@/lib/recruiter-scheduling";

export type RecruiterPipelineRow = {
  application_id: number;
  candidate_name: string;
  job_title: string;
  company: string;
  status: string;
  pipeline_status: string;
  scheduling_status?: string | null;
  manual_slot_at?: string | null;
  manual_slot_duration_minutes?: number | null;
  manual_meeting_link?: string | null;
  updated_at?: string | null;
};

export const RECRUITER_PIPELINE_FILTERS = [
  "all",
  "review",
  "accepted",
  "to_contact",
  "invited",
  "rejected",
  "on_hold",
] as const;

export type RecruiterPipelineFilter = (typeof RECRUITER_PIPELINE_FILTERS)[number];

export function recruiterPipelineStatusLabelKey(
  status: string,
): "pipelineStatusNew" | "pipelineStatusReview" | "pipelineStatusAccepted" | "pipelineStatusToContact" | "pipelineStatusInvited" | "pipelineStatusRejected" | "pipelineStatusOnHold" {
  const s = status.trim().toLowerCase();
  if (s === "new") return "pipelineStatusNew";
  if (s === "review") return "pipelineStatusReview";
  if (s === "accepted") return "pipelineStatusAccepted";
  if (s === "to_contact") return "pipelineStatusToContact";
  if (s === "invited") return "pipelineStatusInvited";
  if (s === "rejected") return "pipelineStatusRejected";
  return "pipelineStatusOnHold";
}

export function recruiterPipelineFilterLabelKey(
  filter: RecruiterPipelineFilter,
): "filterAll" | ReturnType<typeof recruiterPipelineStatusLabelKey> {
  if (filter === "all") return "filterAll";
  return recruiterPipelineStatusLabelKey(filter);
}

export function recruiterPipelineNextActionKey(
  pipelineStatus: string,
): "nextActionReview" | "nextActionAccepted" | "nextActionToContact" | "nextActionInvited" | "nextActionRejected" | "nextActionOnHold" | null {
  const s = pipelineStatus.trim().toLowerCase();
  if (s === "review" || s === "new") return "nextActionReview";
  if (s === "accepted") return "nextActionAccepted";
  if (s === "to_contact") return "nextActionToContact";
  if (s === "invited") return "nextActionInvited";
  if (s === "rejected") return "nextActionRejected";
  if (s === "on_hold") return "nextActionOnHold";
  return null;
}

export function pipelineScheduledSlotLabel(
  row: Pick<RecruiterPipelineRow, "manual_slot_at" | "manual_slot_duration_minutes">,
  locale: Locale,
): string | null {
  return formatScheduledSlotDisplay(row.manual_slot_at, row.manual_slot_duration_minutes, locale);
}
