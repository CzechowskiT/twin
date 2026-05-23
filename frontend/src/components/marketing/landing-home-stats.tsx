"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

type MvpStats = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  job_boards_in_registry: number;
};

const FALLBACK: MvpStats = {
  validated_jobs: 12840,
  registered_users: 420,
  total_applications: 890,
  job_boards_in_registry: 24,
};

export function LandingHomeStats() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<MvpStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpStats;
        if (!cancelled) setData(json);
      } catch {
        /* use fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data ?? FALLBACK;
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
