"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DemoSampleBadge } from "@/components/marketing/demo-sample-badge";
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
  fullDemoHref?: string;
};

type LoadState = "loading" | "ready" | "offline";

const SKELETON_ROWS = 4;

function DemoSnapshotShell({
  children,
  signupHref,
  fullDemoHref,
  busy,
}: {
  children: ReactNode;
  signupHref: string;
  fullDemoHref?: string;
  busy?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section
      className="marketing-section-demo-feed demo-glass-panel p-5 sm:p-6"
      aria-labelledby="demo-live-feed-heading"
      aria-busy={busy || undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <DemoSampleBadge />
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("demo.liveEyebrow" as TranslationKey)}
          </p>
          <h2 id="demo-live-feed-heading" className="twin-section-title mt-2 text-lg">
            {t("demo.liveTitle" as TranslationKey)}
          </h2>
          <p className="text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.liveLead" as TranslationKey)}</p>
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

function DemoSnapshotSkeletonRows({ disabled }: { disabled?: boolean }) {
  return (
    <ul
      className={`mt-5 space-y-3 ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-hidden={disabled || undefined}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <li
          key={i}
          className="demo-ranking-row rounded-xl px-4 py-3"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--twin-border)]/60" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--twin-border)]/40" />
        </li>
      ))}
    </ul>
  );
}

export function DemoLiveSnapshot({ fullDemoHref }: DemoLiveSnapshotProps = {}) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/demo/snapshot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DemoSnapshot | null) => {
        if (cancelled) return;
        if (data?.top_matches?.length) {
          setSnapshot(data);
          setLoadState("ready");
        } else {
          setLoadState("offline");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = snapshot?.signup_cta_path || "/register";

  if (loadState === "loading") {
    return (
      <DemoSnapshotShell signupHref={signup} fullDemoHref={fullDemoHref} busy>
        <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("demo.liveLoading" as TranslationKey)}</p>
        <DemoSnapshotSkeletonRows />
      </DemoSnapshotShell>
    );
  }

  if (loadState === "offline" || !snapshot) {
    return (
      <DemoSnapshotShell signupHref={signup} fullDemoHref={fullDemoHref}>
        <p
          role="status"
          className="mt-5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
        >
          <span className="font-semibold">{t("demo.liveOffline" as TranslationKey)}</span>
          <span className="mt-1 block text-xs leading-relaxed opacity-90">
            {t("demo.liveOfflineHint" as TranslationKey)}
          </span>
        </p>
        <DemoSnapshotSkeletonRows disabled />
      </DemoSnapshotShell>
    );
  }

  const maxScore = Math.max(...snapshot.top_matches.map((row) => row.score), 1);

  return (
    <DemoSnapshotShell signupHref={signup} fullDemoHref={fullDemoHref}>
      {snapshot.source === "live_db" ? (
        <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("demo.liveSourceDb" as TranslationKey)}</p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {snapshot.top_matches.slice(0, 5).map((row, i) => {
          const score = Math.round(row.score);
          const barWidth = Math.round((row.score / maxScore) * 100);
          return (
            <li
              key={`${row.company}-${row.title}`}
              className="demo-ranking-row group rounded-xl px-4 py-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--twin-accent)]">
                    {row.title}
                  </p>
                  <p className="text-sm text-[var(--twin-muted-strong)]">
                    {row.company}
                    {row.location ? ` · ${row.location}` : ""}
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
      {snapshot.scheduled_interview ? (
        <p className="mt-4 text-xs text-[var(--twin-muted)]">
          {t("demo.liveInterviewHint" as TranslationKey)}: {snapshot.scheduled_interview.job_title} @{" "}
          {snapshot.scheduled_interview.company_name}
        </p>
      ) : null}
    </DemoSnapshotShell>
  );
}
