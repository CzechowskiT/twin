"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { useTranslation } from "@/components/language-provider";
import { DEMO_WALKTHROUGH_JOBS } from "@/lib/demo-walkthrough-data";
import type { TranslationKey } from "@/lib/i18n";

type DemoLiveSnapshotProps = {
  fullDemoHref?: string;
};

function DemoSnapshotShell({
  children,
  signupHref,
  fullDemoHref,
}: {
  children: ReactNode;
  signupHref: string;
  fullDemoHref?: string;
}) {
  const { t } = useTranslation();

  return (
    <section
      className="marketing-section-demo-feed demo-glass-panel p-5 sm:p-6"
      aria-labelledby="demo-live-feed-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("demo.liveEyebrow" as TranslationKey)}
          </p>
          <h2 id="demo-live-feed-heading" className="twin-section-title mt-2 text-lg">
            {t("demo.liveTitle" as TranslationKey)}
          </h2>
          <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("demo.liveLead" as TranslationKey)}</p>
        </div>
        <Link
          href={signupHref}
          className="section-cta-primary marketing-btn-primary-shadow twin-touch-target !min-h-[2.5rem] px-5 text-sm"
        >
          {t("demo.signUpToApply" as TranslationKey)}
        </Link>
      </div>
      {children}
      {fullDemoHref ? (
        <p className="mt-4">
          <Link
            href={fullDemoHref}
            className="demo-full-experience-link inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--twin-accent)]"
          >
            {t("demo.fullExperienceCta" as TranslationKey)} →
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** Home marketing strip — always synthetic sample, no API. */
export function DemoLiveSnapshot({ fullDemoHref }: DemoLiveSnapshotProps = {}) {
  const { t } = useTranslation();
  const rows = DEMO_WALKTHROUGH_JOBS.filter((j) => j.inTop20).slice(0, 4);
  const maxScore = Math.max(...rows.map((row) => row.score), 1);

  return (
    <DemoSnapshotShell signupHref="/waitlist" fullDemoHref={fullDemoHref}>
      <ul className="mt-5 space-y-3">
        {rows.map((row, i) => {
          const score = Math.round(row.score);
          const barWidth = Math.round((row.score / maxScore) * 100);
          return (
            <li
              key={row.id}
              className="demo-ranking-row group rounded-xl px-4 py-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--twin-accent)]">
                    {row.title}
                  </p>
                  <p className="text-sm text-[var(--twin-muted-strong)]">
                    {row.company} · {row.location}
                  </p>
                </div>
                <DemoMatchGauge score={score} size="sm" />
              </div>
              <div className="demo-ranking-bar mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--twin-border)]/50">
                <div
                  className="demo-ranking-bar__fill h-full rounded-full"
                  style={{ width: `${barWidth}%`, animationDelay: `${i * 80 + 150}ms` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-800/90 dark:text-amber-200/90">
        {t("demo.syntheticBadge" as TranslationKey)}
      </p>
    </DemoSnapshotShell>
  );
}
