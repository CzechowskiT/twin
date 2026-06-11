"use client";

import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  RECRUITER_MESSAGE_DRAFT_TEMPLATE_IDS,
  RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS,
  buildRecruiterMessageDraftContext,
  defaultRecruiterContactPhase,
  readRecruiterMessageDraftStore,
  renderRecruiterMessageDraft,
  type RecruiterContactPhase,
  type RecruiterMessageDraftRow,
  type RecruiterMessageDraftTemplateId,
  writeRecruiterMessageDraftStore,
} from "@/lib/recruiter-message-drafts";

type Props = {
  open: boolean;
  row: RecruiterMessageDraftRow;
  recruiterName?: string;
  onClose: () => void;
  onContactPhaseChange?: (phase: RecruiterContactPhase) => void;
};

function templateLabelKey(id: RecruiterMessageDraftTemplateId): TranslationKey {
  const map: Record<RecruiterMessageDraftTemplateId, TranslationKey> = {
    invitation: "recruiterMessageDrafts.templateInvitation",
    missingInfo: "recruiterMessageDrafts.templateMissingInfo",
    availability: "recruiterMessageDrafts.templateAvailability",
    holdFollowUp: "recruiterMessageDrafts.templateHoldFollowUp",
  };
  return map[id];
}

export function RecruiterMessageDraftPanel({
  open,
  row,
  recruiterName = "",
  onClose,
  onContactPhaseChange,
}: Props) {
  const { t, locale } = useTranslation();
  const storageKey = String(row.application_id);
  const savedDraft = readRecruiterMessageDraftStore()[storageKey];
  const context = useMemo(
    () => buildRecruiterMessageDraftContext(row, recruiterName),
    [row, recruiterName],
  );
  const initialTemplate = savedDraft?.templateId ?? "invitation";
  const initialDraft = useMemo(
    () =>
      savedDraft?.editedSubject && savedDraft.editedBody
        ? { subject: savedDraft.editedSubject, body: savedDraft.editedBody }
        : renderRecruiterMessageDraft(initialTemplate, context, locale),
    [savedDraft, initialTemplate, context, locale],
  );
  const [templateId, setTemplateId] = useState<RecruiterMessageDraftTemplateId>(initialTemplate);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [contactPhase, setContactPhase] = useState<RecruiterContactPhase>(
    savedDraft?.contactPhase ?? defaultRecruiterContactPhase(row.status),
  );
  const [copied, setCopied] = useState(false);

  const applyTemplate = useCallback(
    (nextTemplate: RecruiterMessageDraftTemplateId) => {
      const draft = renderRecruiterMessageDraft(nextTemplate, context, locale);
      setTemplateId(nextTemplate);
      setSubject(draft.subject);
      setBody(draft.body);
    },
    [context, locale],
  );

  function persistDraft(next: {
    templateId?: RecruiterMessageDraftTemplateId;
    subject?: string;
    body?: string;
    contactPhase?: RecruiterContactPhase;
  }) {
    const store = readRecruiterMessageDraftStore();
    store[storageKey] = {
      templateId: next.templateId ?? templateId,
      editedSubject: next.subject ?? subject,
      editedBody: next.body ?? body,
      contactPhase: next.contactPhase ?? contactPhase,
      updatedAt: new Date().toISOString(),
    };
    writeRecruiterMessageDraftStore(store);
  }

  function handleTemplateChange(next: RecruiterMessageDraftTemplateId) {
    applyTemplate(next);
    const draft = renderRecruiterMessageDraft(next, context, locale);
    persistDraft({ templateId: next, subject: draft.subject, body: draft.body });
  }

  function handleSubjectChange(value: string) {
    setSubject(value);
    persistDraft({ subject: value });
  }

  function handleBodyChange(value: string) {
    setBody(value);
    persistDraft({ body: value });
  }

  function updateContactPhase(next: RecruiterContactPhase) {
    setContactPhase(next);
    persistDraft({ contactPhase: next });
    onContactPhaseChange?.(next);
  }

  async function copyDraft() {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={`${RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS.panel} fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruiter-message-draft-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`${RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS.notSentBanner} text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400`}
            >
              {t("recruiterMessageDrafts.notSentBanner")}
            </p>
            <h2 id="recruiter-message-draft-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
              {t("recruiterMessageDrafts.panelTitle")}
            </h2>
            <p className="twin-muted mt-1 text-sm">
              {t("recruiterMessageDrafts.panelLead")
                .replace("{name}", row.candidate_name)
                .replace("{role}", row.job_title)}
            </p>
          </div>
          <button type="button" className="twin-btn-ghost text-sm" onClick={onClose}>
            {t("recruiterMessageDrafts.close")}
          </button>
        </div>

        <p className={`${RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS.twinNoSend} mt-3 text-xs text-[var(--twin-muted-strong)]`}>
          {t("recruiterMessageDrafts.twinNoSendDisclaimer")}
        </p>

        <label className="mt-4 block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterMessageDrafts.templateLabel")}
          <select
            className="twin-input mt-1 w-full text-sm"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value as RecruiterMessageDraftTemplateId)}
          >
            {RECRUITER_MESSAGE_DRAFT_TEMPLATE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(templateLabelKey(id))}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterMessageDrafts.subjectLabel")}
          <input
            className="twin-input mt-1 w-full text-sm"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
          />
        </label>

        <label className="mt-3 block text-xs font-medium text-[var(--foreground)]">
          {t("recruiterMessageDrafts.bodyLabel")}
          <span className={`${RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS.editHint} ml-2 font-normal text-[var(--twin-muted)]`}>
            {t("recruiterMessageDrafts.editBeforeSendHint")}
          </span>
          <textarea
            className="twin-input mt-1 min-h-[12rem] w-full text-sm leading-relaxed"
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`${RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS.copyButton} twin-btn-solid text-sm`}
            onClick={() => void copyDraft()}
          >
            {copied ? t("recruiterMessageDrafts.copied") : t("recruiterMessageDrafts.copy")}
          </button>
        </div>

        <div className="mt-6 border-t border-[var(--twin-border)]/70 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("recruiterMessageDrafts.contactStatusTitle")}
          </p>
          <p className="twin-muted mt-1 text-xs">{t("recruiterMessageDrafts.contactStatusHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`twin-btn-ghost text-xs ${contactPhase === "contacted" ? "border-[var(--twin-accent)]" : ""}`}
              onClick={() => updateContactPhase("contacted")}
            >
              {t("recruiterMessageDrafts.markContacted")}
            </button>
            <button
              type="button"
              className={`twin-btn-ghost text-xs ${contactPhase === "to_contact" ? "border-[var(--twin-accent)]" : ""}`}
              onClick={() => updateContactPhase("to_contact")}
            >
              {t("recruiterMessageDrafts.moveToContact")}
            </button>
            <button
              type="button"
              className={`twin-btn-ghost text-xs ${contactPhase === "invited" ? "border-[var(--twin-accent)]" : ""}`}
              onClick={() => updateContactPhase("invited")}
            >
              {t("recruiterMessageDrafts.markInvited")}
            </button>
          </div>
          <p className="twin-muted mt-2 text-xs">
            {t(
              contactPhase === "contacted"
                ? "recruiterMessageDrafts.phaseContacted"
                : contactPhase === "invited"
                  ? "recruiterMessageDrafts.phaseInvited"
                  : "recruiterMessageDrafts.phaseToContact",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
