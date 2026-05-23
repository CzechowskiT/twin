"use client";

import { useTranslation } from "@/components/language-provider";
import { useMvpStats } from "@/lib/use-mvp-stats";

/** Hero social proof: live job counter + honest join line. */
export function LandingLiveProof({ className = "" }: { className?: string }) {
  const { t, locale } = useTranslation();
  const { data: stats, loading } = useMvpStats();
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const count = stats
    ? stats.validated_jobs.toLocaleString(loc)
    : loading
      ? "…"
      : t("home.liveCounterUnavailable");
  const counter = t("home.liveCounter").replace("{count}", count);

  return (
    <div className={`landing-live-proof ${className}`.trim()}>
      <p className="landing-live-proof__counter text-sm font-semibold tabular-nums text-[var(--twin-accent)]">
        {counter}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("home.socialProofJoin")}</p>
      <blockquote className="landing-live-proof__quote mt-3 border-s-2 border-[var(--twin-accent)]/40 ps-3 text-sm italic text-[var(--twin-muted)]">
        {t("home.socialProofQuote")}
      </blockquote>
    </div>
  );
}
