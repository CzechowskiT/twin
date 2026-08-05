"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { PRODUCT_FUNNEL_CLIENT_ENABLED } from "@/lib/features";

const STEPS = ["welcome", "privacy", "profile", "skills", "preferences"] as const;
const STORAGE_KEY = "twin_onboarding_step_v2";

type StepKey = (typeof STEPS)[number];

function readStoredStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 && n < STEPS.length ? n : 0;
}

/** Epic 2.9 first-value: land on Home/Today (Daily OS), not a forced module tour. */
function postOnboardingPath(): string {
  return "/dashboard";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login/candidate");
    else queueMicrotask(() => setStep(readStoredStep()));
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const completeOnboarding = useCallback(
    async (opts?: { celebrate?: boolean }) => {
      const token = getToken();
      if (!token) {
        router.replace("/login/candidate");
        return false;
      }
      await apiFetch("/api/v1/auth/onboarding/complete", { method: "POST" }, token);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      if (PRODUCT_FUNNEL_CLIENT_ENABLED) {
        trackEvent("onboarding_completed", {
          surface: "onboarding",
          ttv_matches_redirect: TTV_MATCHES_REDIRECT_ENABLED,
        });
      }
      if (opts?.celebrate) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast.success(t("onboardingFlow.doneToast"));
      }
      return true;
    },
    [router, t],
  );

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      await completeOnboarding({ celebrate: true });
      if (PRODUCT_FUNNEL_CLIENT_ENABLED) {
        trackEvent("pilot_consent_oriented", { surface: "onboarding_finish" });
        trackEvent("pilot_first_value_reached", { surface: "onboarding_finish" });
      }
      router.push(postOnboardingPath());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboardingFlow.failed"));
    } finally {
      setFinishing(false);
    }
  }, [completeOnboarding, router, t]);

  const skipToDashboard = useCallback(async () => {
    setFinishing(true);
    try {
      await completeOnboarding();
      if (PRODUCT_FUNNEL_CLIENT_ENABLED) {
        trackEvent("pilot_onboarding_skipped", { surface: "onboarding_skip" });
        trackEvent("pilot_first_value_reached", { surface: "onboarding_skip" });
      }
      router.push(postOnboardingPath());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboardingFlow.failed"));
    } finally {
      setFinishing(false);
    }
  }, [completeOnboarding, router, t]);

  const key: StepKey = STEPS[step] ?? "welcome";
  const isLast = step >= STEPS.length - 1;
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  const profileCta = (
    <Link href="/profile" className="twin-btn-solid twin-touch-target mb-4 inline-block text-center">
      {t("onboarding.profileLink")}
    </Link>
  );

  return (
    <Shell rail>
      <Card>
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--twin-accent)]">
              {t("onboardingFlow.progressLabel")} {step + 1}/{STEPS.length} ·{" "}
              {t("onboardingFlow.progressPercent").replace("{pct}", String(progressPct))}
            </p>
            <div
              className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--twin-border)]"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[var(--twin-accent)] transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">{t(`onboardingFlow.${key}Title` as TranslationKey)}</h1>
            <p className="twin-muted mb-6 text-sm leading-relaxed">
              {t(`onboardingFlow.${key}Body` as TranslationKey)}
            </p>
            {key === "privacy" ? (
              <ul className="twin-muted mb-6 list-disc space-y-2 pl-5 text-sm">
                <li>{t("pilotConsolidation.privacyBulletConsent")}</li>
                <li>{t("pilotConsolidation.privacyBulletOptional")}</li>
                <li>{t("pilotConsolidation.privacyBulletControl")}</li>
              </ul>
            ) : null}
            {key !== "welcome" && key !== "privacy" ? profileCta : null}
            <div className="flex flex-wrap gap-3">
              {!isLast ? (
                <button type="button" className="twin-btn-solid twin-touch-target" onClick={() => setStep((s) => s + 1)}>
                  {t("onboardingFlow.next")}
                </button>
              ) : (
                <button
                  type="button"
                  className="twin-btn-solid twin-touch-target"
                  disabled={finishing}
                  onClick={() => void finish()}
                >
                  {t("onboardingFlow.finish")}
                </button>
              )}
              {step > 0 ? (
                <button type="button" className="twin-btn-secondary text-sm" onClick={() => setStep((s) => s - 1)}>
                  {t("onboardingFlow.back")}
                </button>
              ) : null}
              <button
                type="button"
                className="twin-btn-ghost text-sm"
                disabled={finishing}
                onClick={() => void skipToDashboard()}
              >
                {t("onboardingFlow.skip")}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>
    </Shell>
  );
}
