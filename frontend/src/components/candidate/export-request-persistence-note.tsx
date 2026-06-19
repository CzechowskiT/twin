"use client";

import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  createExportRequestRecord,
  type ExportRequestType,
} from "@/lib/export-requests";

type Props = {
  testId?: string;
  requestType?: ExportRequestType;
  onCreated?: () => void;
};

export function ExportRequestPersistenceNote({
  testId = "export-request-persistence-note",
  requestType,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const [writeStatus, setWriteStatus] = useState<"idle" | "live" | "demo">("idle");
  const [saving, setSaving] = useState(false);

  const writeKey =
    writeStatus === "live"
      ? "safePersistence.internalWriteLive"
      : writeStatus === "demo"
        ? "safePersistence.internalWriteDemo"
        : null;

  async function onQueue(): Promise<void> {
    if (!requestType) return;
    setSaving(true);
    setWriteStatus("idle");
    const result = await createExportRequestRecord(requestType);
    setWriteStatus(result.wrote ? "live" : "demo");
    if (result.wrote) onCreated?.();
    setSaving(false);
  }

  return (
    <div data-testid={testId} className="space-y-2">
      <p className="rounded border border-dashed px-3 py-2 text-xs text-[var(--twin-muted-strong)]">
        {t("exportRequests.inlineNote")}
      </p>
      {requestType ? (
        <div>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            onClick={() => void onQueue()}
            disabled={saving}
            data-testid={`${testId}-queue-action`}
          >
            {t("exportRequests.queueAction")}
          </button>
          {writeKey ? <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t(writeKey)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
