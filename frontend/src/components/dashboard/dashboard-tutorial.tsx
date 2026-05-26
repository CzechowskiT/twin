"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const STORAGE_KEY = "twin_dashboard_tutorial_done";

const STEPS = ["matches", "calendar", "applications", "feedback"] as const;

export function DashboardTutorial({ onOpenFeedback }: { onOpenFeedback?: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) queueMicrotask(() => setVisible(true));
    } catch {
      queueMicrotask(() => setVisible(true));
    }
  }, []);

  if (!visible) return null;

  const key = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const next = () => {
    if (isLast) {
      finish();
      onOpenFeedback?.();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="dashboard-tutorial-overlay" role="dialog" aria-modal="true">
      <div className="dashboard-tutorial-card">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--twin-accent)]">
          {t("tutorial.stepLabel")} {step + 1}/{STEPS.length}
        </p>
        <h2 className="mb-2 text-lg font-semibold">{t(`tutorial.${key}Title` as TranslationKey)}</h2>
        <p className="twin-muted mb-4 text-sm leading-relaxed">{t(`tutorial.${key}Body` as TranslationKey)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="twin-btn-solid text-sm" onClick={next}>
            {isLast ? t("tutorial.done") : t("tutorial.next")}
          </button>
          <button type="button" className="twin-btn-secondary text-sm" onClick={finish}>
            {t("tutorial.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
