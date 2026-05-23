"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

type DemoJobMatch = {
  title: string;
  company: string;
  location?: string | null;
  score: number;
};

type DemoSnapshot = {
  demo_mode?: boolean;
  source?: string;
  headline?: string;
  top_matches: DemoJobMatch[];
  application?: { job_title: string; company: string; status: string } | null;
  scheduled_interview?: {
    job_title: string;
    company_name: string;
    interview_start: string;
  } | null;
  signup_cta_path?: string;
};

type DemoLiveSnapshotProps = {
  /** When set, show a secondary link to the full /demo simulation page. */
  fullDemoHref?: string;
};

export function DemoLiveSnapshot({ fullDemoHref }: DemoLiveSnapshotProps = {}) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/demo/snapshot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DemoSnapshot | null) => {
        if (!cancelled && data?.top_matches?.length) setSnapshot(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !snapshot) return null;

  const signup = snapshot.signup_cta_path || "/register";

  return (
    <section
      className="marketing-section-demo-feed rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 shadow-sm sm:p-6"
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
          {snapshot.source === "live_db" ? (
            <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("demo.liveSourceDb" as TranslationKey)}</p>
          ) : null}
        </div>
        <Link
          href={signup}
          className="section-cta-primary marketing-btn-primary-shadow twin-touch-target !min-h-[2.5rem] px-5 text-sm"
        >
          {t("demo.signUpToApply" as TranslationKey)}
        </Link>
      </div>
      <ul className="mt-5 space-y-3">
        {snapshot.top_matches.slice(0, 5).map((row) => (
          <li
            key={`${row.company}-${row.title}`}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[var(--twin-border)]/80 bg-[var(--twin-card)] px-4 py-3"
          >
            <div>
              <p className="font-semibold text-[var(--foreground)]">{row.title}</p>
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {row.company}
                {row.location ? ` · ${row.location}` : ""}
              </p>
            </div>
            <span className="text-lg font-semibold tabular-nums text-[var(--twin-accent)]">
              {Math.round(row.score)}%
            </span>
          </li>
        ))}
      </ul>
      {snapshot.scheduled_interview ? (
        <p className="mt-4 text-xs text-[var(--twin-muted)]">
          {t("demo.liveInterviewHint" as TranslationKey)}: {snapshot.scheduled_interview.job_title} @{" "}
          {snapshot.scheduled_interview.company_name}
        </p>
      ) : null}
      {fullDemoHref ? (
        <p className="mt-4">
          <Link
            href={fullDemoHref}
            className="text-sm font-semibold text-[var(--twin-accent)] underline-offset-4 hover:underline"
          >
            {t("demo.fullExperienceCta" as TranslationKey)} →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
