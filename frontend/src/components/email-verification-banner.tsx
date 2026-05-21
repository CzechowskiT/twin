"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Me = { email_verified?: boolean; email_verified_at?: string | null };

export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const me = await apiFetch<Me>("/api/v1/auth/me", {}, token);
      setShow(!me.email_verified && !me.email_verified_at);
    } catch {
      setShow(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resend() {
    setBusy(true);
    try {
      const out = await apiFetch<{ message: string }>("/api/v1/auth/verify-email/resend", {
        method: "POST",
      });
      toast.success(out.message || t("verifyEmail.sent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("verifyEmail.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]"
      role="status"
    >
      <p className="font-medium">{t("verifyEmail.bannerTitle")}</p>
      <p className="twin-muted mt-1 text-xs sm:text-sm">{t("verifyEmail.bannerBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="twin-btn-solid twin-touch-target text-xs sm:text-sm"
          disabled={busy}
          onClick={() => void resend()}
        >
          {busy ? t("common.loading") : t("verifyEmail.resend")}
        </button>
        <Link href="/verify-email" className="twin-btn-secondary twin-touch-target text-xs sm:text-sm">
          {t("verifyEmail.openPage")}
        </Link>
      </div>
    </div>
  );
}
