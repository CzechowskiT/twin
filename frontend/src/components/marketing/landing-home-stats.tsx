"use client";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useMvpStats } from "@/lib/use-mvp-stats";

export function LandingHomeStats() {
  const { t, locale } = useTranslation();
  const stats = useMvpStats();
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  const items = [
    { label: t("home.statJobs"), value: fmt(stats.validated_jobs) },
    { label: t("home.statUsers"), value: fmt(stats.registered_users) },
    { label: t("home.statApps"), value: fmt(stats.total_applications) },
    { label: t("home.statBoards"), value: fmt(stats.job_boards_in_registry) },
  ];

  return (
    <section className="py-4 sm:py-6" aria-label={t("home.statsAria")}>
      <ScrollReveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/60 px-4 py-5 text-center backdrop-blur-sm"
            >
              <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-3xl">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
