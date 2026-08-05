"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

/** Calm Home/Today next-action hierarchy — reuses Daily OS below; no fabricated urgency. */
export function PilotHomeNextAction() {
  const { t } = useTranslation();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void apiFetch(
      "/api/v1/candidates/me/pilot-consolidation/telemetry",
      {
        method: "POST",
        body: JSON.stringify({ event_name: "pilot_home_opened", properties: { surface: "dashboard" } }),
      },
      token
    ).catch(() => undefined);
  }, []);

  return (
    <Card data-pilot-home-today>
      <h2 className="text-lg font-medium">{t("pilotConsolidation.homeTodayTitle")}</h2>
      <p className="mt-1 text-sm opacity-80">{t("pilotConsolidation.homeTodayLead")}</p>
      <p className="mt-2 text-sm opacity-70">{t("pilotConsolidation.homeEmpty")}</p>
      <nav aria-label={t("pilotConsolidation.homeTodayTitle")} className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link className="twin-link" href="/dashboard/career">
          {t("pilotConsolidation.homeOpenDirection")}
        </Link>
        <Link className="twin-link" href="/dashboard/matches">
          {t("pilotConsolidation.homeOpenOpportunities")}
        </Link>
        <Link className="twin-link" href="/dashboard/portfolio">
          {t("pilotConsolidation.homeOpenEvidence")}
        </Link>
        <Link className="twin-link" href="/dashboard/approvals">
          {t("pilotConsolidation.homeOpenDecisions")}
        </Link>
      </nav>
      <p className="mt-2 text-xs opacity-60">{t("pilotConsolidation.claimKind")}</p>
    </Card>
  );
}
