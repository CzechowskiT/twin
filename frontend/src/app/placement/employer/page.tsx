"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function PlacementEmployerConfirmPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    if (!token) {
      setErr(t("placementEmployer.missingToken"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/v1/placement/employer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { detail?: string; message?: string };
      if (!res.ok) throw new Error(body.detail ?? body.message ?? String(res.status));
      setDone(body.message ?? t("placementEmployer.success"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("placementEmployer.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("placementEmployer.title")}</h1>
        <p className="twin-muted mb-6 text-sm leading-relaxed">{t("placementEmployer.lead")}</p>
        {!token ? <p className="text-sm text-amber-700">{t("placementEmployer.missingToken")}</p> : null}
        {done ? (
          <p className="text-sm font-medium text-emerald-700">{done}</p>
        ) : (
          <button
            type="button"
            className="twin-btn-solid twin-touch-target"
            disabled={busy || !token}
            onClick={() => void confirm()}
          >
            {busy ? "…" : t("placementEmployer.confirm")}
          </button>
        )}
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
        <Link href="/" className="twin-link mt-6 inline-block text-sm">
          {t("placementEmployer.home")}
        </Link>
      </Card>
    </Shell>
  );
}
