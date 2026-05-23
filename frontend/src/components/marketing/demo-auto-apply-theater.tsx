"use client";

import Link from "next/link";
import { forwardRef } from "react";

import { DemoConfettiBurst } from "@/components/marketing/demo-confetti-burst";
import { useTranslation } from "@/components/language-provider";
import {
  DEMO_JOB_CARD,
  DEMO_MATCH_JOB,
  DEMO_MATCH_SCORE,
} from "@/lib/demo-auto-apply-data";
import { DEMO_SEQUENCE_STEPS, type DemoPlayPhase, type DemoStepState } from "@/lib/demo-auto-apply-sequence";
import type { TranslationKey } from "@/lib/i18n";

type DemoAutoApplyTheaterProps = {
  playPhase: DemoPlayPhase;
  stepStates: DemoStepState[];
  animatedScore: number;
  showConfetti: boolean;
  onConfettiDone: () => void;
  onJumpToStep: (idx: number) => void;
  isLoggedIn: boolean;
  canRunLiveApply: boolean;
  realApplying: boolean;
  applyTargetError: boolean;
  onRunRealApply: () => void;
};

const SCAN_JOBS = [
  { title: "Senior Fullstack Developer", board: "pracuj.pl" },
  { title: "Python Backend Engineer", board: "rocketjobs.pl" },
  { title: "Staff Platform Engineer", board: "pracuj.pl" },
] as const;

export const DemoAutoApplyTheater = forwardRef<HTMLElement, DemoAutoApplyTheaterProps>(function DemoAutoApplyTheater(
  {
    playPhase,
    stepStates,
    animatedScore,
    showConfetti,
    onConfettiDone,
    onJumpToStep,
    isLoggedIn,
    canRunLiveApply,
    realApplying,
    applyTargetError,
    onRunRealApply,
  },
  ref,
) {
  const { t } = useTranslation();
  const activeIdx = stepStates.findIndex((s) => s === "active");
  const doneCount = stepStates.filter((s) => s === "done").length;
  const railProgress = playPhase === "done" ? 100 : Math.max(8, (doneCount / DEMO_SEQUENCE_STEPS.length) * 100);

  const highlightCv = activeIdx === 2 || stepStates[2] === "done";
  const highlightJob = activeIdx >= 1 || doneCount >= 1;
  const showCalendar = activeIdx === 4 || stepStates[4] === "done" || playPhase === "done";

  return (
    <section
      ref={ref}
      aria-labelledby="demo-theater-heading"
      className="demo-auto-apply-theater relative overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/95 p-5 shadow-md sm:p-6"
    >
      <DemoConfettiBurst active={showConfetti} onDone={onConfettiDone} />

      <h2 id="demo-theater-heading" className="twin-section-title text-lg sm:text-xl">
        {t("demo.flowTitle")}
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative pl-1">
          <div className="demo-theater-rail absolute bottom-2 left-[0.65rem] top-2 w-0.5 rounded-full bg-[var(--twin-border)]/70" aria-hidden>
            <div
              className="demo-theater-rail-fill absolute left-0 top-0 w-full rounded-full bg-[var(--twin-accent)]"
              style={{ height: `${railProgress}%` }}
            />
          </div>
          <ol className="relative space-y-1">
            {DEMO_SEQUENCE_STEPS.map((key, idx) => {
              const state = stepStates[idx] ?? "pending";
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onJumpToStep(idx)}
                    className={`demo-theater-step flex w-full gap-3 rounded-xl border p-3 text-left transition-all duration-500 sm:gap-4 ${
                      state === "active"
                        ? "demo-theater-step--active border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/55"
                        : state === "done"
                          ? "border-[var(--twin-accent)]/25 bg-[var(--twin-card)]/80 opacity-100"
                          : "border-transparent opacity-50 hover:border-[var(--twin-border)]/60 hover:bg-[var(--twin-card)]/40"
                    }`}
                  >
                    <span
                      className={`demo-theater-dot mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        state === "done"
                          ? "border-[var(--twin-accent)] bg-[var(--twin-accent)] text-[var(--twin-on-accent)]"
                          : state === "active"
                            ? "demo-theater-dot--pulse border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] text-[var(--twin-accent)]"
                            : "border-[var(--twin-border)] bg-[var(--twin-card)] text-transparent"
                      }`}
                      aria-hidden
                    >
                      {state === "done" ? "✓" : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{t(key)}</p>
                      <p className="mt-0.5 text-xs text-[var(--twin-muted)]">
                        {t(`demo.stepDetail${idx}` as TranslationKey)}
                      </p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted)]">
                        {state === "done"
                          ? t("demo.stepDone")
                          : state === "active"
                            ? t("demo.stepActive")
                            : t("demo.stepPending")}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative space-y-4">
          {(activeIdx === 0 || stepStates[0] === "done") && (
            <div className="demo-theater-reveal demo-ranking-panel space-y-3 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.theaterScanTitle")}</p>
              <ul className="space-y-2">
                {SCAN_JOBS.map((job, i) => (
                  <li
                    key={job.title}
                    className={`demo-ranking-row demo-theater-reveal rounded-lg px-3 py-2.5 ${job.score >= DEMO_MATCH_SCORE ? "demo-ranking-row--top" : ""}`}
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">{job.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--twin-muted)]">{job.board}</p>
                      </div>
                      <DemoMatchGauge score={job.score} size="sm" />
                    </div>
                    <div className="demo-ranking-bar mt-2 h-1 overflow-hidden rounded-full bg-[var(--twin-border)]/60">
                      <div
                        className="demo-ranking-bar__fill h-full rounded-full"
                        style={{ width: `${job.score}%`, animationDelay: `${i * 120 + 200}ms` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
              highlightJob
                ? "demo-theater-glow border-[var(--twin-accent)]/45 bg-[var(--twin-accent-muted)]/35"
                : "border-[var(--twin-border)] bg-[var(--twin-card)]/60 opacity-70"
            }`}
          >
            <p className="text-base font-semibold text-[var(--foreground)]">{DEMO_MATCH_JOB.title}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">
              {DEMO_JOB_CARD.company} · {DEMO_JOB_CARD.board}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.matchBadge")}</span>
              <span className="text-3xl font-semibold tabular-nums text-[var(--foreground)]">{animatedScore}%</span>
              {animatedScore >= DEMO_MATCH_SCORE ? (
                <span className="demo-theater-reveal text-xs font-semibold text-[var(--twin-accent)]">{t("demo.matchLocked")}</span>
              ) : null}
            </div>
          </div>

          {highlightCv ? (
            <div className="demo-theater-reveal demo-theater-glow rounded-xl border border-[var(--twin-accent)]/40 bg-[var(--twin-card)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.theaterTailorTitle")}</p>
              <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t("demo.theaterTailorBody")}</p>
            </div>
          ) : null}

          {showCalendar ? (
            <div className="demo-theater-reveal rounded-xl border border-[var(--twin-accent)]/35 bg-[var(--twin-card)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.theaterCalendarTitle")}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{t("demo.theaterCalendarSlot")}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("demo.theaterCalendarHint")}</p>
            </div>
          ) : null}

          {playPhase === "done" ? (
            <div
              className="demo-theater-reveal relative rounded-xl border-2 border-[var(--twin-accent)]/50 bg-[var(--twin-card)] p-5 shadow-[var(--twin-shadow-md)]"
              role="status"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--twin-accent)]">{t("demo.queuedEyebrow")}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("demo.queuedTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("demo.queuedBody")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {canRunLiveApply ? (
                  <button
                    type="button"
                    disabled={realApplying}
                    onClick={onRunRealApply}
                    className="section-cta-primary marketing-btn-primary-shadow twin-touch-target !w-auto px-5 text-sm"
                  >
                    {realApplying ? t("demo.runningRealCta") : t("demo.runRealCta")}
                  </button>
                ) : isLoggedIn && applyTargetError ? (
                  <p className="text-sm text-amber-800 dark:text-amber-200">{t("demo.noApplyTarget")}</p>
                ) : (
                  <>
                    <Link href="/register" className="section-cta-primary marketing-btn-primary-shadow twin-touch-target px-5 text-sm">
                      {t("demo.registerCta")}
                    </Link>
                    <Link href="/login/candidate" className="section-cta-secondary twin-touch-target px-5 text-sm">
                      {t("demo.loginCta")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});
