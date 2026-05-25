"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { FoundingOfferPreview } from "@/components/marketing/founding-offer-preview";
import { InteractiveDemoCta } from "@/components/marketing/interactive-demo-cta";
import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import {
  WaitlistControlSection,
  WaitlistCoverageSection,
  WaitlistExampleSection,
  WaitlistFoundingCounter,
  WaitlistFoundingSection,
  WaitlistHow8Section,
  WaitlistProblemSection,
  WaitlistRankingSection,
  WaitlistReferralSection,
  WaitlistSourcesSection,
  WaitlistTop200Section,
  WaitlistWhatTwinSection,
  WaitlistWhyFoundingSection,
} from "@/components/waitlist/waitlist-page-sections";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import type { BetaLeaderboardEntry } from "@/lib/beta-api";
import { useTranslation } from "@/components/language-provider";
import { LOCALE_HTML_LANG } from "@/lib/i18n";
import { formatWaitlist } from "@/lib/waitlist-messages";
import { useWaitlistCopy } from "@/lib/waitlist/use-waitlist-copy";
import { useWaitlistStats } from "@/lib/waitlist/use-waitlist-stats";

function useTypingHeadline(text: string) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    setShown("");
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 38);
    return () => window.clearInterval(id);
  }, [text]);
  return shown;
}

function LeaderboardTable({
  rows,
  lineTemplate,
}: {
  rows: BetaLeaderboardEntry[];
  lineTemplate: string;
}) {
  return (
    <ol className="mt-4 space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.rank} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2">
          <span>
            {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : `#${r.rank}`} {r.display_name}
          </span>
          <span className="text-[var(--wl-text-secondary)]">
            {formatWaitlist(lineTemplate, { referrals: r.referrals })}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function WaitlistPageClient() {
  const copy = useWaitlistCopy();
  const { locale } = useTranslation();
  const typed = useTypingHeadline(copy.heroHeadline);
  const { stats, leaderboard, spotsRemaining, signupsToday, cap, total, statsLive, loading: statsLoading, error: statsError } =
    useWaitlistStats();

  const numberLocale = LOCALE_HTML_LANG[locale];
  const activity = useMemo(() => stats?.recent?.slice(-5).reverse() ?? [], [stats]);

  const metrics = [
    { label: copy.metricSpots, value: cap, live: true },
    { label: copy.metricSigned, value: total, live: true },
    { label: copy.metricRemaining, value: spotsRemaining, live: true },
    { label: copy.metricJobs, value: stats?.validated_jobs ?? 0, live: Boolean(stats) },
  ];

  const positionPreview = `#${Math.min(total + 1, cap)}`;

  return (
    <motion.div className="wl-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="wl-mesh" aria-hidden />
      <motion.div className="wl-grid-bg" aria-hidden />
      <motion.div className="wl-glow-orb wl-glow-orb--purple" aria-hidden />
      <motion.div className="wl-glow-orb wl-glow-orb--cyan" aria-hidden />
      <div className="wl-inner">
        <header className="wl-top-bar">
          <Link href="/" className="wl-logo">
            TWIN<span>.</span>
          </Link>
          <motion.div className="wl-top-actions">
            <LanguageSwitcher />
            <Link href="/" className="wl-back-home">
              {copy.backHome}
            </Link>
          </motion.div>
        </header>

        <section className="wl-hero wl-hero--cinematic" id="join">
          <div className="wl-hero-grid">
            <div className="wl-hero-copy">
              <p className="wl-hero-eyebrow">{copy.heroEyebrow}</p>
              <motion.h1 className="wl-gradient-text wl-hero-headline">{typed}</motion.h1>
              <motion.div
                className="wl-hero-leads"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <p className="wl-hero-lead">{copy.heroLead1}</p>
                <p className="wl-hero-lead">{copy.heroLead2}</p>
                <p className="wl-hero-lead wl-hero-lead--accent">{copy.heroLead3}</p>
              </motion.div>
              <FoundingOfferPreview variant="waitlist" />
              <InteractiveDemoCta variant="waitlist" className="mt-6 max-w-xl" />
            </div>
            <aside className="wl-hero-panel">
              <WaitlistFoundingCounter
                copy={copy}
                spotsRemaining={spotsRemaining}
                cap={cap}
                total={total}
                loading={statsLoading}
                error={Boolean(statsError)}
                statsLive={statsLive}
              />
              <WaitlistForm key={locale} spotsRemaining={spotsRemaining} signupsToday={signupsToday} cap={cap} />
            </aside>
          </div>
        </section>

        <WaitlistSourcesSection copy={copy} />
        <WaitlistProblemSection copy={copy} />
        <WaitlistTop200Section copy={copy} />
        <WaitlistWhatTwinSection copy={copy} />
        <WaitlistRankingSection copy={copy} />
        <WaitlistControlSection copy={copy} />
        <WaitlistCoverageSection copy={copy} />
        <WaitlistFoundingSection copy={copy} />
        <WaitlistHow8Section copy={copy} />
        <WaitlistWhyFoundingSection copy={copy} />
        <WaitlistExampleSection copy={copy} />

        <WaitlistReferralSection copy={copy} positionLine={copy.boostPositionHint}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="wl-card">
              <p className="text-sm font-bold text-cyan-400">{copy.boostPositionTitle}</p>
              <p className="mt-4 text-4xl font-bold tabular-nums">{positionPreview}</p>
              <p className="mt-4 text-xs text-[var(--wl-text-muted)]">{copy.boostRewards}</p>
            </div>
            <div className="wl-card">
              <p className="font-bold">{copy.leaderboardTitle}</p>
              <LeaderboardTable rows={leaderboard} lineTemplate={copy.leaderboardLine} />
            </div>
          </div>
        </WaitlistReferralSection>

        <section className="wl-section">
          <h2 className="wl-section-title">{copy.sectionStats}</h2>
          <div className="wl-metrics">
            {metrics.map((m) => (
              <div key={m.label} className="wl-card text-center">
                <p className="wl-metric-value">
                  {m.live ? <AnimatedCounter value={m.value} /> : m.value.toLocaleString(numberLocale)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--wl-text-muted)]">{m.label}</p>
              </div>
            ))}
          </div>
          {activity.length > 0 ? (
            <ul className="mt-6 space-y-2 text-sm text-emerald-400">
              {activity.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="wl-live-dot" />
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="wl-section wl-section--faq" id="faq">
          <h2 className="wl-section-title">{copy.sectionFaq}</h2>
          {copy.faq.map((item) => (
            <details key={item.q} className="wl-faq-item">
              <summary>{item.q}</summary>
              <p className="pb-4 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{item.a}</p>
            </details>
          ))}
        </section>

        <section className="wl-section" id="cta-bottom">
          <div className="wl-final-cta">
            <h2 className="text-3xl font-bold">{copy.finalTitle}</h2>
            <p className="mt-2 text-[var(--wl-text-secondary)]">{copy.finalLead}</p>
            <p className="mt-2 text-sm">{formatWaitlist(copy.finalJoin, { cap })}</p>
            <p className="mt-4 text-sm text-[var(--wl-text-muted)]">
              {formatWaitlist(copy.finalSpotsLine, { spots: spotsRemaining, today: signupsToday })}
            </p>
            <div className="mt-8">
              <WaitlistForm
                key={`${locale}-compact`}
                spotsRemaining={spotsRemaining}
                signupsToday={signupsToday}
                cap={cap}
                compact
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center text-xs text-[var(--wl-text-muted)]">
          <Link href="/privacy" className="text-cyan-400">
            {copy.footerPrivacy}
          </Link>
          {" · "}
          <Link href="/terms" className="text-cyan-400">
            {copy.footerTerms}
          </Link>
          {" · "}
          <Link href="/beta" className="text-cyan-400">
            {copy.footerBeta}
          </Link>
        </footer>
      </div>
    </motion.div>
  );
}
