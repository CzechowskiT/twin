"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoAudioController } from "@/components/marketing/demo/sales/demo-audio-controller";
import { InteractiveFlowSurface } from "@/components/marketing/demo/sales/interactive-flow-surface";
import {
  trackDemoCompleted,
  trackDemoInteraction,
  trackDemoOutcome,
  trackDemoStarted,
  trackDemoViewed,
} from "@/lib/demo/demo-analytics";
import {
  interactiveFlowSteps,
  type InteractiveFlowStep,
} from "@/lib/demo/interactive-flow-config";
import type { SalesDemoRole } from "@/lib/demo/sales-demo-config";
import type { TranslationKey } from "@/lib/i18n";

type InteractiveRoleFlowProps = {
  role: SalesDemoRole;
  reducedMotion: boolean;
  saveData: boolean;
};

export function InteractiveRoleFlow({ role, reducedMotion, saveData }: InteractiveRoleFlowProps) {
  const { t, locale } = useTranslation();
  const steps = interactiveFlowSteps(role);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gestureUnlocked, setGestureUnlocked] = useState(false);
  const [decisionChoice, setDecisionChoice] = useState<"accept" | "decline" | null>(null);
  const [decisionHover, setDecisionHover] = useState<"accept" | "decline" | null>(null);
  const startedRef = useRef(false);
  const viewedRef = useRef(false);
  const beatRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const step: InteractiveFlowStep = steps[stepIndex] ?? steps[0]!;
  const completed = stepIndex >= steps.length - 1 && step.phase === "outcome";
  const effectiveReducedMotion = reducedMotion || saveData;

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackDemoViewed({ locale, reduced_motion: effectiveReducedMotion, surface: "interactive-flow" });
  }, [locale, effectiveReducedMotion]);

  useEffect(() => {
    if (effectiveReducedMotion || startedRef.current) return;
    startedRef.current = true;
    trackDemoStarted({ role, locale, mode: "interactive-flow" });
    setPlaying(true);
  }, [effectiveReducedMotion, role, locale]);

  useEffect(() => {
    if (step.analyticsBeat === beatRef.current) return;
    beatRef.current = step.analyticsBeat;
    trackDemoInteraction({ action: step.analyticsBeat, role, locale });
  }, [step.analyticsBeat, role, locale]);

  const advance = useCallback(() => {
    setStepIndex((idx) => {
      const next = idx + 1;
      if (next >= steps.length) {
        setPlaying(false);
        trackDemoCompleted({ role, locale, mode: "interactive-flow" });
        return idx;
      }
      return next;
    });
  }, [steps.length, role, locale]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!playing || effectiveReducedMotion) return;
    if (step.phase === "decision" || step.phase === "outcome") return;
    if (step.durationMs <= 0) return;

    timerRef.current = window.setTimeout(advance, step.durationMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [playing, stepIndex, step, advance, effectiveReducedMotion]);

  const handleDecision = useCallback(
    (choice: "accept" | "decline") => {
      setGestureUnlocked(true);
      setDecisionChoice(choice);
      trackDemoInteraction({ action: `decision_${choice}`, role, locale });
      setStepIndex((idx) => {
        const decisionIdx = steps.findIndex((s) => s.phase === "decision");
        return decisionIdx >= 0 ? decisionIdx + 1 : idx + 1;
      });
      setPlaying(true);
    },
    [role, locale, steps],
  );

  useEffect(() => {
    if (step.phase === "outcome" && decisionChoice) {
      trackDemoOutcome({
        role,
        outcome: decisionChoice === "accept" ? "accepted" : "declined",
        locale,
      });
    }
  }, [step.phase, decisionChoice, role, locale]);

  const handlePlayPause = () => {
    setGestureUnlocked(true);
    if (!startedRef.current) {
      startedRef.current = true;
      trackDemoStarted({ role, locale, mode: "interactive-flow" });
    }
    setPlaying((p) => !p);
  };

  const handleRestart = () => {
    setGestureUnlocked(true);
    setStepIndex(0);
    setDecisionChoice(null);
    setPlaying(!effectiveReducedMotion);
    beatRef.current = null;
  };

  const unlockGesture = () => setGestureUnlocked(true);

  const outcomeKey = `demoSales.roleOutcome_${role}` as TranslationKey;

  return (
    <div
      className="interactive-role-flow"
      data-interactive-role-flow
      data-role={role}
      onPointerDown={unlockGesture}
    >
      <div className="interactive-role-flow__toolbar">
        <DemoAudioController enabled={!saveData} gestureUnlocked={gestureUnlocked} />
        <span className="interactive-role-flow__badge">{t("demoSales.sampleBadge")}</span>
      </div>

      <div
        className="interactive-role-flow__stage"
        data-demo-interactive-stage
        data-demo-flow-phase={step.phase}
        onPointerDown={unlockGesture}
      >
        <InteractiveFlowSurface
          role={role}
          phase={step.phase}
          decisionChoice={decisionChoice}
          decisionHover={decisionHover}
          onDecisionHover={setDecisionHover}
          onDecisionClick={handleDecision}
          reducedMotion={effectiveReducedMotion}
        />
      </div>

      <p className="interactive-role-flow__caption" data-demo-flow-caption data-demo-canonical-caption>
        {t(step.captionKey)}
      </p>

      <div className="interactive-role-flow__controls">
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
          data-demo-flow-play
          onClick={handlePlayPause}
        >
          {playing ? t("demoSales.pause") : t("demoSales.play")}
        </button>
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
          data-demo-flow-restart
          onClick={handleRestart}
        >
          {t("demoInteractive.restart")}
        </button>
      </div>

      {completed ? (
        <div
          className="demo-outcome-screen interactive-role-flow__outcome"
          data-demo-outcome
          data-role={role}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("demoExperience.outcomeEyebrow")}
          </p>
          <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t(outcomeKey)}</p>
          <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("demoExperience.boundaryNote")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/waitlist" className="twin-btn-primary twin-touch-target text-sm" data-demo-cta="pilot">
              {t("demoSales.ctaPresentation")}
            </Link>
          </div>
        </div>
      ) : null}

      {effectiveReducedMotion ? (
        <div className="interactive-role-flow__step-nav">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`interactive-role-flow__step-btn ${i === stepIndex ? "interactive-role-flow__step-btn--active" : ""}`}
              data-demo-flow-step={s.id}
              onClick={() => {
                setGestureUnlocked(true);
                setStepIndex(i);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
