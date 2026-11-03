"use client";

import { useCallback, useState, type ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { createPrivacyRequestLive } from "@/lib/candidate-trust-live";
import type { PrivacyRequest } from "@/lib/candidate-trust-api";

type Props = {
  requestType: PrivacyRequest["request_type"];
  testId: string;
  notePlaceholder?: string;
};

/** Authenticated privacy-request submit — idempotent, no outbound email. */
export function CandidateTrustLivePrivacyForm({ requestType, testId, notePlaceholder }: Props): ReactNode {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PrivacyRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const idempotencyKey = `wave1-${requestType}-${Date.now()}`;
      const created = await createPrivacyRequestLive(
        requestType,
        { note: note.trim() || undefined, source: "wave1_trust_ui" },
        idempotencyKey,
      );
      setResult(created);
    } catch {
      setError("submit_failed");
    } finally {
      setBusy(false);
    }
  }, [note, requestType]);

  return (
    <div data-testid={testId} className="space-y-3 rounded-lg border border-[var(--twin-border)]/70 p-4">
      <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustLive.privacyFormLead")}</p>
      <label className="block text-xs font-medium" htmlFor={`${testId}-note`}>
        {t("candidateTrustLive.privacyNoteLabel")}
      </label>
      <textarea
        id={`${testId}-note`}
        className="twin-input min-h-[72px] w-full text-sm"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={notePlaceholder ?? t("candidateTrustLive.privacyNotePlaceholder")}
        maxLength={500}
      />
      <button
        type="button"
        className="twin-btn-primary twin-touch-target"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? t("candidateTrustLive.submitting") : t("candidateTrustLive.submitPrivacyRequest")}
      </button>
      {error ? <p className="text-xs text-rose-500">{t("candidateTrustLive.submitError")}</p> : null}
      {result ? (
        <p className="text-xs text-[var(--twin-muted-strong)]" data-testid={`${testId}-result`}>
          {t("candidateTrustLive.submitSuccess")} #{result.id} · {result.status} · {result.manual_processing_notice}
        </p>
      ) : null}
    </div>
  );
}
