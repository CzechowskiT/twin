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

const STEPS = ["welcome", "profile", "skills", "preferences", "cv"] as const;
const STORAGE_KEY = "twin_onboarding_step_v1";

type StepKey = (typeof STEPS)[number];

function readStoredStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 && n < STEPS.length ? n : 0;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login/candidate");
    else setStep(readStoredStep());
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      await apiFetch("/api/v1/auth/onboarding/complete", { method: "POST" });
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      toast.success(t("onboardingFlow.doneToast"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboardingFlow.failed"));
    } finally {
      setFinishing(false);
    }
  }, [router, t]);

  const key: StepKey = STEPS[step] ?? "welcome";
  const isLast = step >= STEPS.length - 1;

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
              {t("onboardingFlow.progressLabel")} {step + 1}/{STEPS.length}
            </p>
            <h1 className="mb-2 text-2xl font-semibold">{t(`onboardingFlow.${key}Title` as TranslationKey)}</h1>
            <p className="twin-muted mb-6 text-sm leading-relaxed">
              {t(`onboardingFlow.${key}Body` as TranslationKey)}
            </p>
            {key !== "welcome" ? profileCta : null}
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
              <button type="button" className="twin-btn-ghost text-sm" onClick={() => router.push("/dashboard")}>
                {t("onboardingFlow.skip")}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>
    </Shell>
  );
}
