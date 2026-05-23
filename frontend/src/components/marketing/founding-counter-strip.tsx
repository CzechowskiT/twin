"use client";

import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import { useTranslation } from "@/components/language-provider";
import { useWaitlistStats } from "@/lib/waitlist/use-waitlist-stats";

function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}

/** Live founding spots counter — matches `/waitlist` scarcity strip on marketing pages. */
export function FoundingCounterStrip({ className = "" }: { className?: string }) {
  const { t, locale } = useTranslation();
  const numberLocale = locale === "pl" ? "pl-PL" : "en-US";
  const { spotsRemaining, cap, loading, error, statsLive } = useWaitlistStats();

  const filled = Math.min(100, Math.round(((cap - spotsRemaining) / Math.max(cap, 1)) * 100));

  return (
    <div
      className={`marketing-founding-counter ${className}`.trim()}
      role="status"
      aria-label={t("home.foundingCounterAria")}
    >
      <div className="marketing-founding-counter__head">
        <p className="marketing-founding-counter__eyebrow">{t("home.foundingCounterEyebrow")}</p>
        <p className="marketing-founding-counter__spots">
          {loading ? (
            <span className="text-[var(--twin-muted)]">{t("home.foundingCounterLoading")}</span>
          ) : (
            <>
              <AnimatedCounter value={spotsRemaining} locale={numberLocale} />
              <span className="marketing-founding-counter__of">
                {interpolate(t("home.foundingCounterOf"), { cap })}
              </span>
            </>
          )}
        </p>
      </div>
      <div
        className="marketing-founding-counter__bar"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("home.foundingCounterAria")}
      >
        <div className="marketing-founding-counter__fill" style={{ width: `${filled}%` }} />
      </div>
      {error ? (
        <p className="marketing-founding-counter__hint marketing-founding-counter__hint--warn">{t("home.foundingCounterOffline")}</p>
      ) : statsLive ? (
        <p className="marketing-founding-counter__hint">
          <span className="marketing-founding-counter__live-dot" aria-hidden />
          {t("home.foundingCounterLive")}
        </p>
      ) : null}
    </div>
  );
}
