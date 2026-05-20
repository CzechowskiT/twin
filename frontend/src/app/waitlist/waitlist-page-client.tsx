"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import type { BetaLeaderboardEntry } from "@/lib/beta-api";
import { useTranslation } from "@/components/language-provider";
import { LOCALE_HTML_LANG } from "@/lib/i18n";
import { formatWaitlist } from "@/lib/waitlist-messages";
import { useWaitlistCopy } from "@/lib/waitlist/use-waitlist-copy";
import { useWaitlistStats } from "@/lib/waitlist/use-waitlist-stats";

// Re-mount form when locale changes so Zod messages and placeholders refresh.

function useTypingHeadline(text: string) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    setShown("");
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [text]);
  return shown;
}

function useCountdown(labelTemplate: string) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const ms = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const countdown = `${h}h ${m}min ${s}s`;
      setLeft(formatWaitlist(labelTemplate, { countdown }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [labelTemplate]);
  return left;
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
            {formatWaitlist(lineTemplate, { referrals: r.referrals, reward: r.reward })}
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
  const countdown = useCountdown(copy.finalMidnight);
  const { stats, leaderboard, spotsRemaining, signupsToday, cap, total, statsLive, loading: statsLoading, error: statsError } =
    useWaitlistStats();
  const [terminalStep, setTerminalStep] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const numberLocale = LOCALE_HTML_LANG[locale];

  useEffect(() => {
    if (terminalStep >= copy.terminalSteps.length) return;
    const delay = terminalStep % 2 === 0 ? 500 : 280;
    const id = window.setTimeout(() => setTerminalStep((s) => s + 1), delay);
    return () => window.clearTimeout(id);
  }, [terminalStep, copy.terminalSteps.length]);

  useEffect(() => {
    setTerminalStep(0);
  }, [copy.heroHeadline]);

  useEffect(() => {
    const id = window.setInterval(
      () => setTestimonialIdx((i) => (i + 1) % copy.testimonials.length),
      5000,
    );
    return () => window.clearInterval(id);
  }, [copy.testimonials.length]);

  const activity = useMemo(() => stats?.recent?.slice(-5).reverse() ?? [], [stats]);

  const metrics = [
    { label: copy.metricSpots, value: cap, live: true },
    { label: copy.metricSigned, value: total, live: true },
    { label: copy.metricRemaining, value: spotsRemaining, live: true },
    { label: copy.metricJobs, value: stats?.validated_jobs ?? 12847, live: Boolean(stats) },
  ];

  const testimonial = copy.testimonials[testimonialIdx] ?? copy.testimonials[0];

  return (
    <motion.div className="wl-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="wl-mesh" aria-hidden />
      <motion.div className="wl-grid-bg" aria-hidden />
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

        <section className="wl-hero">
          <motion.h1 className="wl-gradient-text">{typed}</motion.h1>
          <motion.p className="wl-hero-lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {copy.heroLead1}
            <br />
            {copy.heroLead2}
            <br />
            {copy.heroLead3}
          </motion.p>
          <p className="wl-hero-badge">{copy.heroOfferBadge}</p>
          <p className="wl-hero-offer-sub">{copy.heroOfferSub}</p>
          <ul className="wl-value-strip" aria-label="Founding offer">
            {copy.valueStrip.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {statsError ? (
            <p className="wl-stats-offline" role="status">
              {copy.statsOfflineHint}
            </p>
          ) : statsLoading ? (
            <p className="wl-stats-live wl-stats-live--loading" role="status" aria-busy="true">
              <span className="wl-live-dot" aria-hidden />
              {copy.statsLoadingLabel}
            </p>
          ) : statsLive ? (
            <p className="wl-stats-live" role="status">
              <span className="wl-live-dot" aria-hidden />
              {copy.statsLiveLabel}
            </p>
          ) : null}
          <WaitlistForm
            key={locale}
            spotsRemaining={spotsRemaining}
            signupsToday={signupsToday}
            cap={cap}
          />
        </section>

        <section className="wl-section wl-section--why">
          <h2 className="wl-section-title">{copy.sectionWhy}</h2>
          <p className="wl-section-lead">{copy.whyLead}</p>
          <motion.div className="wl-pillar-grid">
            {copy.whyPillars.map((pillar) => (
              <motion.article key={pillar.title} className="wl-card wl-pillar-card">
                <span className="wl-pillar-icon" aria-hidden>
                  {pillar.icon}
                </span>
                <h3 className="text-lg font-bold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{pillar.body}</p>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">{copy.sectionHow}</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div className="wl-terminal" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <motion.div className="wl-window-dots" aria-hidden>
                <span className="bg-red-500" />
                <span className="bg-yellow-500" />
                <span className="bg-green-500" />
              </motion.div>
              <p className="mb-3 text-xs text-slate-500">{copy.terminalTitle}</p>
              {copy.terminalSteps.slice(0, terminalStep).map((line) => (
                <motion.div key={line}>{line}</motion.div>
              ))}
              {terminalStep < copy.terminalSteps.length ? (
                <span className="inline-block h-4 w-2 animate-pulse bg-cyan-400" />
              ) : null}
            </motion.div>
            <motion.div className="wl-calendar" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-sm font-semibold text-slate-400">{copy.calendarTitle}</p>
              {copy.calendar.map((ev) => (
                <motion.div key={`${ev.day}-${ev.time}`} className="wl-calendar-day">
                  <p className="text-xs font-bold text-slate-400">{ev.day}</p>
                  <p className="mt-1 text-sm font-semibold">{ev.time}</p>
                  <p className="text-sm">{ev.title}</p>
                  <p className="text-xs text-cyan-400">Online ({ev.link})</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">{copy.sectionCompare}</h2>
          <div className="wl-compare-grid">
            <div className="wl-card wl-compare-bad">
              <h3 className="text-lg font-bold text-red-400">{copy.compareBadTitle}</h3>
              <ul className="mt-4 space-y-3 text-sm text-[var(--wl-text-secondary)]">
                {copy.compareBad.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="wl-card wl-compare-good">
              <h3 className="text-lg font-bold text-emerald-400">{copy.compareGoodTitle}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {copy.compareGood.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="wl-section wl-section--shift">
          <h2 className="wl-section-title">{copy.sectionShift}</h2>
          <p className="wl-section-lead">{copy.shiftLead}</p>
          <ul className="wl-shift-list">
            {copy.shiftPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="wl-section">
          <motion.article
            className="wl-founding-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="wl-founding-eyebrow">{copy.sectionFounding}</p>
            <h2 className="wl-founding-title">{copy.foundingHeadline}</h2>
            <p className="wl-founding-sub">{copy.foundingSub}</p>
            <ul className="wl-founding-perks">
              {copy.foundingPerks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <p className="wl-founding-fine">{copy.foundingFinePrint}</p>
          </motion.article>
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">{copy.sectionStats}</h2>
          <div className="wl-metrics">
            {metrics.map((m) => (
              <div key={m.label} className="wl-card text-center">
                <p className="wl-metric-value">
                  {m.live ? (
                    <AnimatedCounter value={m.value} />
                  ) : (
                    m.value.toLocaleString(numberLocale)
                  )}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--wl-text-muted)]">{m.label}</p>
              </div>
            ))}
          </div>
          <motion.div className="wl-card mt-8" key={testimonialIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-yellow-400">⭐⭐⭐⭐⭐</p>
            <p className="mt-3 text-lg leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
            <p className="mt-3 text-sm text-[var(--wl-text-muted)]">— {testimonial.who}</p>
          </motion.div>
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

        <section className="wl-section">
          <h2 className="wl-section-title">{copy.sectionBoost}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="wl-card">
              <p className="text-sm font-bold text-cyan-400">{copy.boostPositionTitle}</p>
              <p className="mt-4 text-4xl font-bold">#{total + 1 > cap ? cap : total + 1}</p>
              <p className="mt-2 text-sm text-[var(--wl-text-secondary)]">{copy.boostPositionHint}</p>
              <p className="mt-4 text-xs text-[var(--wl-text-muted)]">{copy.boostRewards}</p>
            </div>
            <div className="wl-card">
              <p className="font-bold">{copy.leaderboardTitle}</p>
              <LeaderboardTable rows={leaderboard} lineTemplate={copy.leaderboardLine} />
            </div>
          </div>
        </section>

        <section className="wl-section max-w-2xl">
          <h2 className="wl-section-title">{copy.sectionFaq}</h2>
          {copy.faq.map((item) => (
            <details key={item.q} className="wl-faq-item">
              <summary>{item.q}</summary>
              <p className="pb-4 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{item.a}</p>
            </details>
          ))}
        </section>

        <section className="wl-section">
          <div className="wl-final-cta">
            <h2 className="text-3xl font-bold">{copy.finalTitle}</h2>
            <p className="mt-2 text-[var(--wl-text-secondary)]">{formatWaitlist(copy.finalJoin, { cap })}</p>
            <p className="mt-4 text-sm">
              {formatWaitlist(copy.finalSpotsLine, { spots: spotsRemaining, today: signupsToday })}
            </p>
            <p className="mt-2 text-xs text-[var(--wl-text-muted)]">{countdown}</p>
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
