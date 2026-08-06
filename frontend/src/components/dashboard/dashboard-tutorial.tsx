"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const STORAGE_KEY = "twin_ia_product_tour_v1_done";

/** 7-area IA tour — skippable, accessible; tour ≠ first value. */
const STEPS = [
  { key: "home", title: "tutorial.homeTitle", body: "tutorial.homeBody" },
  { key: "direction", title: "tutorial.directionTitle", body: "tutorial.directionBody" },
  { key: "opportunities", title: "tutorial.matchesTitle", body: "tutorial.matchesBody" },
  { key: "evidence", title: "tutorial.applicationsTitle", body: "tutorial.applicationsBody" },
  { key: "plan", title: "tutorial.calendarTitle", body: "tutorial.calendarBody" },
  { key: "decisions", title: "tutorial.feedbackTitle", body: "tutorial.feedbackBody" },
  { key: "settings", title: "guidedFv.tourSettingsTitle", body: "guidedFv.tourSettingsBody" },
] as const;

export function DashboardTutorial({ onOpenFeedback }: { onOpenFeedback?: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY) && !localStorage.getItem("twin_dashboard_tutorial_done")) {
        queueMicrotask(() => setVisible(true));
        const token = getToken();
        if (token) {
          void apiFetch(
            "/api/v1/candidates/me/pilot-consolidation/telemetry",
            {
              method: "POST",
              body: JSON.stringify({ event_name: "product_tour_started", properties: { kpi_excluded: true } }),
            },
            token
          ).catch(() => undefined);
        }
      }
    } catch {
      queueMicrotask(() => setVisible(true));
    }
  }, []);

  if (!visible) return null;

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  const emit = (event_name: string) => {
    const token = getToken();
    if (!token) return;
    void apiFetch(
      "/api/v1/candidates/me/pilot-consolidation/telemetry",
      {
        method: "POST",
        body: JSON.stringify({ event_name, properties: { kpi_excluded: true } }),
      },
      token
    ).catch(() => undefined);
  };

  const finish = (skipped: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem("twin_dashboard_tutorial_done", "1");
    } catch {
      /* ignore */
    }
    emit(skipped ? "product_tour_skipped" : "product_tour_completed");
    setVisible(false);
  };

  const next = () => {
    if (isLast) {
      finish(false);
      onOpenFeedback?.();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="dashboard-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="ia-tour-title">
      <div className="dashboard-tutorial-card">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--twin-accent)]">
          {t("tutorial.stepLabel")} {step + 1}/{STEPS.length}
        </p>
        <h2 id="ia-tour-title" className="mb-2 text-lg font-semibold">
          {t(current.title as TranslationKey)}
        </h2>
        <p className="twin-muted mb-4 text-sm leading-relaxed">{t(current.body as TranslationKey)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="twin-btn-solid text-sm" onClick={next}>
            {isLast ? t("tutorial.done") : t("tutorial.next")}
          </button>
          <button type="button" className="twin-btn-secondary text-sm" onClick={() => finish(true)}>
            {t("tutorial.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
