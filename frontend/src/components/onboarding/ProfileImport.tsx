"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ImportResult = {
  profile_completeness: number;
  next_steps: string[];
  source: string;
  applied_to_profile: boolean;
};

export function ProfileImport({ onImported }: { onImported?: () => void }) {
  const { t } = useTranslation();
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importCv = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    if (cvText.trim().length < 50) {
      toast.error(t("strategic.profileImportCvTooShort"));
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ImportResult>(
        "/api/v1/profile/import-cv-text",
        { method: "POST", body: JSON.stringify({ cv_text: cvText }) },
        token,
      );
      setResult(data);
      toast.success(t("strategic.profileImportSuccess"));
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("strategic.profileImportFailed"));
    } finally {
      setLoading(false);
    }
  }, [cvText, onImported, t]);

  const importLinkedIn = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<ImportResult>(
        "/api/v1/profile/import-linkedin",
        { method: "POST", body: JSON.stringify({}) },
        token,
      );
      setResult(data);
      toast.success(t("strategic.profileImportSuccess"));
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("strategic.profileImportFailed"));
    } finally {
      setLoading(false);
    }
  }, [onImported, t]);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">{t("strategic.profileImportTitle")}</h2>
        <p className="twin-muted mt-1 text-sm">{t("strategic.profileImportBody")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkedInLoginButton label={t("strategic.profileImportLinkedIn")} />
        <Button className="twin-btn-secondary !w-auto" disabled={loading} onClick={() => void importLinkedIn()}>
          {t("strategic.profileImportSync")}
        </Button>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">{t("strategic.profileImportCvLabel")}</span>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          rows={5}
          className="w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] p-3 text-sm"
          placeholder={t("strategic.profileImportCvPlaceholder")}
        />
      </label>
      <Button disabled={loading} onClick={() => void importCv()}>
        {loading ? t("strategic.loading") : t("strategic.profileImportCvSubmit")}
      </Button>
      {result ? (
        <p className="text-sm text-[var(--twin-accent)]">
          {t("strategic.profileImportCompleteness").replace("{pct}", String(result.profile_completeness))}
          {" · "}
          {result.source}
        </p>
      ) : null}
    </Card>
  );
}
