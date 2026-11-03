"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Ladder = {
  ladder?: string;
  real_first_value_reached?: boolean;
};

type Disclosure = {
  tiers?: Record<string, { id: string; href: string }[]>;
  eighth_nav_item?: boolean;
};

/** Epic 2.14 — first-value ladder + progressive disclosure (CORE_NOW first). */
export function CanaryFirstValuePanel() {
  const { t } = useTranslation();
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [l, d] = await Promise.all([
        apiFetch("/api/v1/candidates/me/first-value-ladder", {}, token),
        apiFetch("/api/v1/candidates/me/canary-journey/disclosure", {}, token),
      ]);
      setLadder((l as Ladder) || null);
      setDisclosure((d as Disclosure) || null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const advance = async (target: string) => {
    const token = getToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      await apiFetch(
        "/api/v1/candidates/me/first-value-ladder",
        { method: "POST", body: JSON.stringify({ target, lane: "SYNTHETIC" }) },
        token
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const core = disclosure?.tiers?.CORE_NOW || [];

  return (
    <Card data-testid="canary-fv-panel">
      <h2 className="text-lg font-medium">{t("canaryJourney.fvTitle")}</h2>
      <p className="mt-1 text-sm opacity-80">{t("canaryJourney.fvLead")}</p>
      <p className="mt-2 text-sm">
        {t("canaryJourney.ladder")}: <strong>{ladder?.ladder || "READY"}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="twin-btn-secondary text-sm"
          disabled={busy}
          onClick={() => void advance("VIEWED")}
        >
          {t("canaryJourney.markViewed")}
        </button>
        <button
          type="button"
          className="twin-btn-secondary text-sm"
          disabled={busy}
          onClick={() => void advance("ACKNOWLEDGED")}
        >
          {t("canaryJourney.markAck")}
        </button>
        <button
          type="button"
          className="twin-btn-solid text-sm"
          disabled={busy}
          onClick={() => void advance("ACTIONED")}
        >
          {t("canaryJourney.markActioned")}
        </button>
      </div>
      <p className="mt-2 text-xs opacity-60">{t("canaryJourney.notRouteVisit")}</p>
      {core.length ? (
        <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label={t("canaryJourney.coreNow")}>
          <span className="w-full text-xs font-medium opacity-70">{t("canaryJourney.coreNow")}</span>
          {core.map((item) => (
            <Link key={item.id} href={item.href} className="twin-link">
              {item.id}
            </Link>
          ))}
        </nav>
      ) : null}
    </Card>
  );
}
