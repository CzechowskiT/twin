"use client";

import { motion } from "framer-motion";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";
import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import { useTranslation } from "@/components/language-provider";
import { LOCALE_HTML_LANG } from "@/lib/i18n";
import { formatWaitlist } from "@/lib/waitlist-messages";
import type { WaitlistCopy } from "@/lib/waitlist-messages";

type Copy = WaitlistCopy;

export function WaitlistFoundingCounter({
  copy,
  spotsRemaining,
  cap,
  total,
  loading,
  error,
  statsLive,
}: {
  copy: Copy;
  spotsRemaining: number;
  cap: number;
  total: number;
  loading: boolean;
  error: boolean;
  statsLive: boolean;
}) {
  const { locale } = useTranslation();
  const numberLocale = LOCALE_HTML_LANG[locale];
  const filled = Math.min(100, Math.round(((cap - spotsRemaining) / Math.max(cap, 1)) * 100));

  return (
    <motion.article
      className="wl-founding-counter"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      aria-label={copy.counterProgressAria}
    >
      <p className="wl-founding-counter__eyebrow">{copy.counterEyebrow}</p>
      <div className="wl-founding-counter__main">
        {loading ? (
          <p className="wl-founding-counter__loading">{copy.statsLoadingLabel}</p>
        ) : (
          <>
            <p className="wl-founding-counter__spots">
              <AnimatedCounter value={spotsRemaining} locale={numberLocale} />
              <span className="wl-founding-counter__label">{copy.counterRemainingLabel}</span>
            </p>
            <p className="wl-founding-counter__of">
              {formatWaitlist(copy.counterOfCap, { cap })}
            </p>
          </>
        )}
      </div>
      <div
        className="wl-founding-counter__bar"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={copy.counterProgressAria}
      >
        <div className="wl-founding-counter__fill" style={{ width: `${filled}%` }} />
      </div>
      <div className="wl-founding-counter__meta">
        {!loading ? (
          <p className="wl-founding-counter__signed">
            {formatWaitlist(copy.counterOnList, { signed: total.toLocaleString(numberLocale) })}
          </p>
        ) : null}
        {error ? (
          <p className="wl-founding-counter__hint wl-founding-counter__hint--warn">{copy.statsOfflineHint}</p>
        ) : statsLive ? (
          <p className="wl-founding-counter__hint">
            <span className="wl-live-dot" aria-hidden />
            {copy.statsLiveLabel}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

export function WaitlistSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="wl-section-title">{children}</h2>;
}

export function WaitlistSectionLead({ children }: { children: React.ReactNode }) {
  return <p className="wl-section-lead">{children}</p>;
}

export function WaitlistSourcesSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section wl-section--sources" id="sources">
      <WaitlistSectionTitle>{copy.sectionSources}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.sourcesLead}</WaitlistSectionLead>
      <ul className="wl-chip-row" aria-label={copy.sectionSources}>
        {copy.sourceChips.map((chip) => (
          <li key={chip} className="wl-chip">
            {chip}
          </li>
        ))}
      </ul>
      <div className="wl-marquee-wrap">
        <CompanyLogoMarquee />
      </div>
    </section>
  );
}

export function WaitlistProblemSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="problem">
      <WaitlistSectionTitle>{copy.sectionProblem}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.problemLead}</WaitlistSectionLead>
      <ul className="wl-card-grid wl-card-grid--2">
        {copy.problemPoints.map((point) => (
          <li key={point} className="wl-card wl-card--point">
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WaitlistTop200Section({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section wl-section--accent" id="top200">
      <WaitlistSectionTitle>{copy.sectionTop200}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.top200Lead}</WaitlistSectionLead>
      <ul className="wl-card-grid wl-card-grid--2">
        {copy.top200Bullets.map((item) => (
          <li key={item} className="wl-card wl-card--point">
            {item}
          </li>
        ))}
      </ul>
      <div className="wl-rank-preview" aria-hidden>
        <div className="wl-rank-preview__bar">
          <span className="wl-rank-preview__top">Top 20</span>
          <span className="wl-rank-preview__rest">… up to 200</span>
        </div>
        <p className="wl-rank-preview__score">final_score</p>
      </div>
    </section>
  );
}

export function WaitlistWhatTwinSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="what">
      <WaitlistSectionTitle>{copy.sectionWhatTwin}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.whatTwinLead}</WaitlistSectionLead>
      <div className="wl-card-grid wl-card-grid--2">
        {copy.whatTwinItems.map((item) => (
          <article key={item.title} className="wl-card wl-pillar-card">
            <span className="wl-pillar-icon" aria-hidden>
              {item.icon}
            </span>
            <h3 className="text-lg font-bold">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WaitlistRankingSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="ranking">
      <WaitlistSectionTitle>{copy.sectionRanking}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.rankingLead}</WaitlistSectionLead>
      <ul className="wl-card-grid wl-card-grid--2">
        {copy.rankingBullets.map((item) => (
          <li key={item} className="wl-card wl-card--point">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WaitlistControlSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="control">
      <WaitlistSectionTitle>{copy.sectionControl}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.controlLead}</WaitlistSectionLead>
      <div className="wl-status-grid">
        {copy.statusChips.map((chip) => (
          <article key={chip.label} className="wl-card wl-status-card">
            <p className="wl-status-label">{chip.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{chip.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WaitlistCoverageSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="coverage">
      <WaitlistSectionTitle>{copy.sectionCoverage}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.coverageLead}</WaitlistSectionLead>
      <div className="wl-coverage-stats">
        <p className="wl-coverage-stat">{copy.coverageActive}</p>
        <p className="wl-coverage-stat wl-coverage-stat--muted">{copy.coverageRoadmap}</p>
      </div>
      <p className="wl-coverage-pl-label">{copy.plPriorityLabel}</p>
      <ul className="wl-chip-row">
        {copy.plPriorityChips.map((chip) => (
          <li key={chip} className="wl-chip wl-chip--pl">
            {chip}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WaitlistFoundingSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="founding">
      <motion.article
        className="wl-founding-card wl-founding-card--wide"
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
  );
}

export function WaitlistHow8Section({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="how">
      <WaitlistSectionTitle>{copy.sectionHow8}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.how8Lead}</WaitlistSectionLead>
      <ol className="wl-card-grid wl-card-grid--2 wl-card-grid--steps">
        {copy.how8Steps.map((step) => (
          <li key={step.n} className="wl-card wl-step-card">
            <span className="wl-step-n">{step.n}</span>
            <h3 className="font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WaitlistWhyFoundingSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="why-founding">
      <WaitlistSectionTitle>{copy.sectionWhyFounding}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.whyFoundingLead}</WaitlistSectionLead>
      <ul className="wl-shift-list">
        {copy.whyFoundingPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

export function WaitlistExampleSection({ copy }: { copy: Copy }) {
  return (
    <section className="wl-section" id="example">
      <WaitlistSectionTitle>{copy.sectionExample}</WaitlistSectionTitle>
      <p className="wl-example-disclaimer">{copy.exampleDisclaimer}</p>
      <article className="wl-card wl-example-card">
        <h3 className="text-lg font-bold text-cyan-300">{copy.exampleTitle}</h3>
        {copy.exampleParagraphs.map((para) => (
          <p key={para} className="mt-3 text-sm leading-relaxed text-[var(--wl-text-secondary)]">
            {para}
          </p>
        ))}
      </article>
    </section>
  );
}

export function WaitlistReferralSection({
  copy,
  positionLine,
  children,
}: {
  copy: Copy;
  positionLine: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wl-section" id="referral">
      <WaitlistSectionTitle>{copy.sectionReferral}</WaitlistSectionTitle>
      <WaitlistSectionLead>{copy.referralLead}</WaitlistSectionLead>
      <ul className="wl-check-list wl-check-list--compact">
        {copy.referralBullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {children}
      <p className="mt-4 text-center text-xs text-[var(--wl-text-muted)]">{positionLine}</p>
    </section>
  );
}
