/** Recruiter candidate message drafts — copy-only outreach helper. */

import type { Locale } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { normalizeRecruiterInboxStatus } from "@/lib/recruiter-inbox-decision";

export const RECRUITER_MESSAGE_DRAFTS_STORAGE_KEY = "twin_recruiter_message_drafts_v1";

export const RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS = {
  prepareButton: "recruiter-message-draft-prepare-btn",
  panel: "recruiter-message-draft-panel",
  notSentBanner: "recruiter-message-draft-not-sent",
  copyButton: "recruiter-message-draft-copy-btn",
  editHint: "recruiter-message-draft-edit-hint",
  twinNoSend: "recruiter-message-draft-twin-no-send",
} as const;

export type RecruiterMessageDraftTemplateId =
  | "invitation"
  | "missingInfo"
  | "availability"
  | "holdFollowUp";

export const RECRUITER_MESSAGE_DRAFT_TEMPLATE_IDS: RecruiterMessageDraftTemplateId[] = [
  "invitation",
  "missingInfo",
  "availability",
  "holdFollowUp",
];

export type RecruiterContactPhase = "to_contact" | "contacted" | "invited";

export type RecruiterMessageDraftRecord = {
  contactPhase: RecruiterContactPhase;
  templateId: RecruiterMessageDraftTemplateId;
  editedSubject?: string;
  editedBody?: string;
  updatedAt: string;
};

export type RecruiterMessageDraftContext = {
  candidateName: string;
  role: string;
  company: string;
  recruiterName: string;
};

export type RecruiterMessageDraftRow = {
  application_id: number;
  job_title: string;
  company: string;
  candidate_name: string;
  status: string;
  match_score?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  cv_text?: string | null;
};

/** Accepted / to-contact rows only — not awaiting decision or declined. */
export function isRecruiterMessageDraftEligible(status: string): boolean {
  const s = normalizeRecruiterInboxStatus(status);
  return s === "interview" || s === "to_contact";
}

export function extractCandidateFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed.toLowerCase() === "candidate") return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildRecruiterMessageDraftContext(
  row: Pick<RecruiterMessageDraftRow, "candidate_name" | "job_title" | "company">,
  recruiterName = "",
): RecruiterMessageDraftContext {
  const firstName = extractCandidateFirstName(row.candidate_name);
  return {
    candidateName: firstName,
    role: row.job_title.trim(),
    company: row.company.trim(),
    recruiterName: recruiterName.trim() || dictionaries.en.recruiterMessageDrafts.defaultRecruiterName,
  };
}

function applyTemplateTokens(template: string, ctx: RecruiterMessageDraftContext): string {
  const greetingName = ctx.candidateName.trim();
  const nameToken = greetingName ? ` ${greetingName}` : "";
  return template
    .replaceAll("{candidateName}", nameToken)
    .replaceAll("{role}", ctx.role)
    .replaceAll("{company}", ctx.company)
    .replaceAll("{recruiterName}", ctx.recruiterName);
}

export function renderRecruiterMessageDraft(
  templateId: RecruiterMessageDraftTemplateId,
  ctx: RecruiterMessageDraftContext,
  locale: Locale,
): { subject: string; body: string } {
  const copy = dictionaries[locale].recruiterMessageDrafts;
  const subjectKey = `${templateId}Subject` as keyof typeof copy;
  const bodyKey = `${templateId}Body` as keyof typeof copy;
  const subjectTemplate = String(copy[subjectKey] ?? "");
  const bodyTemplate = String(copy[bodyKey] ?? "");
  return {
    subject: applyTemplateTokens(subjectTemplate, ctx),
    body: applyTemplateTokens(bodyTemplate, ctx),
  };
}

const FORBIDDEN_DRAFT_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\+?\d[\d\s().-]{7,}\d\b/,
  /\bsalary\b/i,
  /\bpln\b/i,
  /\bcv_text\b/i,
  /\bcandidate_email\b/i,
  /\bcandidate_phone\b/i,
];

/** Draft text must not leak hidden PII patterns or salary fields. */
export function recruiterMessageDraftIsSafe(text: string): boolean {
  const blob = text.trim();
  if (!blob) return true;
  return !FORBIDDEN_DRAFT_PATTERNS.some((pattern) => pattern.test(blob));
}

export function recruiterMessageDraftUsesOnlySafeFields(row: RecruiterMessageDraftRow): boolean {
  const ctx = buildRecruiterMessageDraftContext(row);
  const draft = renderRecruiterMessageDraft("invitation", ctx, "en");
  const blob = `${draft.subject}\n${draft.body}`;
  if (!recruiterMessageDraftIsSafe(blob)) return false;
  if (row.salary_min != null || row.salary_max != null) {
    if (/\d{3,}/.test(blob) && /salary|pln|compensation|wynagrod/i.test(blob)) return false;
  }
  if (row.candidate_email && blob.includes(row.candidate_email)) return false;
  if (row.candidate_phone && blob.includes(row.candidate_phone)) return false;
  if (row.cv_text && row.cv_text.length > 20 && blob.includes(row.cv_text.slice(0, 20))) return false;
  return true;
}

export function readRecruiterMessageDraftStore(): Record<string, RecruiterMessageDraftRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RECRUITER_MESSAGE_DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RecruiterMessageDraftRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeRecruiterMessageDraftStore(store: Record<string, RecruiterMessageDraftRecord>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECRUITER_MESSAGE_DRAFTS_STORAGE_KEY, JSON.stringify(store));
}

export function defaultRecruiterContactPhase(status: string): RecruiterContactPhase {
  return isRecruiterMessageDraftEligible(status) ? "to_contact" : "to_contact";
}

export function recruiterContactPhaseLabelKey(phase: RecruiterContactPhase): string {
  const map: Record<RecruiterContactPhase, string> = {
    to_contact: "recruiterMessageDrafts.phaseToContact",
    contacted: "recruiterMessageDrafts.phaseContacted",
    invited: "recruiterMessageDrafts.phaseInvited",
  };
  return map[phase];
}
