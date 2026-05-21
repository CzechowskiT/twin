"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

type Preview = { company_name: string; job_title: string };

export default function PlacementEmployerConfirmPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const companyParam = searchParams.get("company")?.trim() ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/v1/placement/employer/preview?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as Preview;
        if (!cancelled) setPreview(data);
      } catch {
        /* optional branding */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const companyLabel = preview?.company_name || companyParam;

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
        {companyLabel ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--twin-accent)]">
            {companyLabel}
            {preview?.job_title ? ` · ${preview.job_title}` : ""}
          </p>
        ) : null}
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
