"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ApplyResult = {
  application_id: number;
  status: string;
  message: string;
  already_applied: boolean;
};

export function OneClickApply({
  jobId,
  jobUrl,
  disabled,
  onApplied,
}: {
  jobId: number;
  jobUrl: string;
  disabled?: boolean;
  onApplied?: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleApply() {
    const token = getToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch<ApplyResult>(
        `/api/v1/jobs/${jobId}/one-click-apply`,
        { method: "POST" },
        token,
      );
      setDone(true);
      toast.success(res.message);
      if (!res.already_applied && jobUrl) {
        window.open(jobUrl, "_blank", "noopener,noreferrer");
      }
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("jobBoard.loadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy || done}
      onClick={() => void handleApply()}
      className="twin-btn-solid twin-touch-target !w-auto px-3 py-1.5 text-xs"
    >
      {done ? t("jobBoard.oneClickApplied") : busy ? t("jobBoard.oneClickApplying") : t("jobBoard.oneClickApply")}
    </button>
  );
}
