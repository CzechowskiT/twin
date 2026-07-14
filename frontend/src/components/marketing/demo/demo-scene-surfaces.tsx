"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DEMO_FIXTURE_BUNDLE } from "@/lib/demo/demo-fixtures";
import { DEMO_CV_META, DEMO_CV_SKILLS, DEMO_CV_TITLES } from "@/lib/demo-walkthrough-data";

type SurfaceProps = {
  compact?: boolean;
  onCtaDemo?: () => void;
  onCtaPilot?: () => void;
};

const ROLE_KEYS = ["candidate", "recruiter", "company"] as const;

const NORTH_STAR_SLOTS = [
  { day: "Mon", time: "—", active: false },
  { day: "Wed", time: "14:00", active: true },
  { day: "Thu", time: "10:30", active: true },
  { day: "Fri", time: "—", active: false },
] as const;

export function DemoIntroSurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-3" : "gap-3 sm:grid-cols-3"}`}>
      {ROLE_KEYS.map((role) => (
        <div
          key={role}
          className={`rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] ${compact ? "p-2" : "p-3"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
            {t(`interactiveDemoPlayer.roleLabel_${role}`)}
          </p>
          <p className={`mt-0.5 font-medium text-[var(--twin-fg)] ${compact ? "text-xs" : "text-sm"}`}>
            {t(`interactiveDemoPlayer.roleCard_${role}`)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DemoNorthStarSurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-[1fr_1fr]" : "gap-3 sm:grid-cols-2"}`}>
      <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-2 sm:p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("interactiveDemoPlayer.northStarCalendarLabel")}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {NORTH_STAR_SLOTS.map((cell) => (
            <div
              key={cell.day}
              className={`rounded-md border px-1 py-1.5 text-center text-[10px] sm:text-xs ${
                cell.active
                  ? "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/30 font-semibold text-[var(--twin-fg)]"
                  : "border-[var(--twin-border)]/60 text-[var(--twin-muted)]"
              }`}
            >
              <p className="font-medium">{cell.day}</p>
              <p className="mt-0.5 tabular-nums">{cell.time}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg border border-dashed border-[var(--twin-accent)]/40 bg-[var(--twin-surface-soft)] p-2 sm:p-3 text-xs sm:text-sm">
          <p className="font-medium text-[var(--twin-fg)]">{slot.title}</p>
          <p className="mt-0.5 text-[var(--twin-muted-strong)]">
            {slot.when} · {slot.duration}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5 text-[10px] text-[var(--twin-fg)]">
            {DEMO_FIXTURE_BUNDLE.inboxCandidate.name}
          </span>
          <span className="rounded-full border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/40 px-2 py-0.5 text-[10px] font-medium text-[var(--twin-accent)]">
            {DEMO_FIXTURE_BUNDLE.inboxCandidate.matchScore}% {t("interactiveDemoPlayer.matchLabel")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DemoCandidatePipelineSurface({ compact }: SurfaceProps) {
  const jobs = compact ? DEMO_FIXTURE_BUNDLE.topJobs.slice(0, 2) : DEMO_FIXTURE_BUNDLE.topJobs;
  return (
    <ul className="space-y-1.5 sm:space-y-2">
      {jobs.map((job) => (
        <li
          key={job.id}
          className="interactive-demo-match-row flex items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-2.5 py-1.5 text-xs sm:gap-3 sm:px-3 sm:py-2 sm:text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--twin-fg)]">{job.title}</p>
            <p className="truncate text-[10px] text-[var(--twin-muted)] sm:text-xs">
              {job.company} · {job.location}
            </p>
          </div>
          <DemoMatchGauge score={job.score} size="sm" />
        </li>
      ))}
    </ul>
  );
}

export function DemoRecruiterInboxSurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  const candidate = DEMO_FIXTURE_BUNDLE.inboxCandidate;
  const card = DEMO_FIXTURE_BUNDLE.reviewCard;
  const tags = compact ? card.requirements_matched.slice(0, 2) : card.requirements_matched.slice(0, 3);
  return (
    <div className="space-y-2 text-xs sm:text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--twin-fg)]">{candidate.name}</p>
          <p className="text-[var(--twin-muted-strong)]">{candidate.title}</p>
        </div>
        <DemoMatchGauge score={candidate.matchScore} size="sm" />
      </div>
      <p className="leading-snug text-[var(--twin-muted-strong)]">{card.why_this_candidate}</p>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/25 px-1.5 py-0.5 text-[10px] text-[var(--twin-accent)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-2 pt-0.5">
        <span className="rounded-md border border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/30 px-2 py-1 text-[10px] font-medium sm:text-xs">
          {t("interactiveDemoPlayer.stageAccept")}
        </span>
        <span className="rounded-md border border-[var(--twin-border)] px-2 py-1 text-[10px] opacity-60 sm:text-xs">
          {t("interactiveDemoPlayer.stageDecline")}
        </span>
      </div>
    </div>
  );
}

export function DemoCompanyMemorySurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  const company = DEMO_FIXTURE_BUNDLE.company;
  const roles = ["Senior Fullstack", "Staff Backend", "Platform Lead"].slice(0, compact ? 2 : 3);
  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
        <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-2 sm:p-3">
          <dt className="text-[10px] text-[var(--twin-muted)]">{t("interactiveDemoPlayer.companyRoles")}</dt>
          <dd className="text-base font-semibold sm:text-lg">{company.talentMemoryRoles}</dd>
        </div>
        <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-2 sm:p-3">
          <dt className="text-[10px] text-[var(--twin-muted)]">{t("interactiveDemoPlayer.companyPipelines")}</dt>
          <dd className="text-base font-semibold sm:text-lg">{company.activePipelines}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => (
          <span
            key={role}
            className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-0.5 text-[10px] text-[var(--twin-fg)]"
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DemoCalendarHoldSurface({ compact, showSimulationNote }: SurfaceProps & { showSimulationNote?: boolean }) {
  const { t } = useTranslation();
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  return (
    <div
      className={`rounded-lg border border-dashed border-[var(--twin-accent)]/40 bg-[var(--twin-surface-soft)] text-xs sm:text-sm ${
        compact ? "p-2.5 sm:p-3" : "p-4"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
        {t("demo.calendarHoldTitle")}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--twin-fg)] sm:text-base">
        {slot.when} · {slot.duration}
      </p>
      <p className="font-medium text-[var(--twin-fg)]">{slot.title}</p>
      <p className="mt-0.5 text-[var(--twin-muted-strong)]">
        {slot.job} @ {slot.company}
      </p>
      {showSimulationNote ? (
        <p className="mt-2 text-[10px] text-[var(--twin-muted)] sm:text-xs">{t("interactiveDemo.calendarSimulation")}</p>
      ) : null}
    </div>
  );
}

export function DemoTrustBoundarySurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  const items = compact
    ? (["sceneTrustH1", "sceneTrustH2"] as const)
    : (["sceneTrustH1", "sceneTrustH2"] as const);
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-xs sm:text-sm">
        <li className="rounded-lg border border-[var(--twin-border)] px-2.5 py-1.5 text-[var(--twin-muted-strong)] sm:px-3 sm:py-2">
          ✓ {t("homepageCandidateStory.trustConsent")}
        </li>
        <li className="rounded-lg border border-[var(--twin-border)] px-2.5 py-1.5 text-[var(--twin-muted-strong)] sm:px-3 sm:py-2">
          ✓ {t("homepageCandidateStory.trustExport")}
        </li>
        {!compact ? (
          <li className="rounded-lg border border-[var(--twin-border)] px-2.5 py-1.5 text-[var(--twin-muted-strong)] sm:px-3 sm:py-2">
            ✓ {t("homepageCandidateStory.trustRevoke")}
          </li>
        ) : null}
      </ul>
      {items.map((key) => (
        <p key={key} className="text-[10px] text-[var(--twin-muted)] sm:text-xs">
          {t(`interactiveDemoPlayer.${key}`)}
        </p>
      ))}
    </div>
  );
}

export function DemoPilotCtaSurface({ compact, onCtaDemo, onCtaPilot }: SurfaceProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:text-sm">
        {t("interactiveDemoPlayer.scenePilotCtaDesc")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/demo#interactive-story"
          className={`section-cta-primary twin-touch-target ${compact ? "px-3 py-1.5 text-xs" : "px-5 text-sm"}`}
          onClick={onCtaDemo}
        >
          {t("homepageCandidateStory.ctaDemo")}
        </Link>
        <Link
          href="/demo#pilot-cta"
          className={`section-cta-secondary twin-touch-target ${compact ? "px-3 py-1.5 text-xs" : "px-5 text-sm"}`}
          onClick={onCtaPilot}
        >
          {t("homepageCandidateStory.ctaPilot")}
        </Link>
      </div>
      <p className="text-[10px] text-[var(--twin-muted)]">{t("interactiveDemoPlayer.scenePilotCtaH1")}</p>
    </div>
  );
}

export function DemoHpStartSurface() {
  const { t } = useTranslation();
  return (
    <p className="rounded-xl border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/20 px-3 py-2.5 text-xs text-[var(--twin-muted-strong)] sm:px-4 sm:py-3 sm:text-sm">
      {t("homepageCandidateStory.scene1Body")}
    </p>
  );
}

export function DemoHpProfileSurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  return (
    <dl className={`grid gap-2 text-xs sm:grid-cols-2 sm:gap-3 sm:text-sm`}>
      <div className="rounded-xl border p-2 sm:p-3">
        <dt className="font-semibold">{t("demo.cvSkills")}</dt>
        <dd className="mt-0.5 text-[var(--twin-muted-strong)]">
          {DEMO_CV_SKILLS.slice(0, compact ? 4 : 5).join(", ")}
        </dd>
      </div>
      <div className="rounded-xl border p-2 sm:p-3">
        <dt className="font-semibold">{t("demo.cvTitles")}</dt>
        <dd className="mt-0.5 text-[var(--twin-muted-strong)]">{DEMO_CV_TITLES.slice(0, 2).join(", ")}</dd>
        <dd className="mt-1 text-[10px] text-[var(--twin-muted)] sm:text-xs">
          {DEMO_CV_META.experienceYears} {t("demo.cvYears")} · {DEMO_CV_META.location}
        </dd>
      </div>
    </dl>
  );
}

export function DemoHpTrustSurface({ compact }: SurfaceProps) {
  const { t } = useTranslation();
  const keys = compact
    ? (["trustConsent", "trustExport"] as const)
    : (["trustConsent", "trustExport", "trustRevoke"] as const);
  return (
    <ul className="space-y-1.5 text-xs text-[var(--twin-muted-strong)] sm:space-y-2 sm:text-sm">
      {keys.map((key) => (
        <li key={key} className="rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2">
          ✓ {t(`homepageCandidateStory.${key}`)}
        </li>
      ))}
    </ul>
  );
}

export function DemoHpBoundariesSurface() {
  const { t } = useTranslation();
  return (
    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-[var(--twin-muted-strong)] sm:px-4 sm:py-3 sm:text-sm">
      {t("homepageCandidateStory.scene5Body")}
    </p>
  );
}

export function DemoHpCtaSurface({ onCtaDemo, onCtaPilot }: SurfaceProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <Link href="/demo" className="section-cta-primary twin-touch-target px-4 py-1.5 text-xs sm:px-5 sm:text-sm" onClick={onCtaDemo}>
        {t("homepageCandidateStory.ctaDemo")}
      </Link>
      <Link
        href="/demo#interactive-story"
        className="section-cta-secondary twin-touch-target px-4 py-1.5 text-xs sm:px-5 sm:text-sm"
        onClick={onCtaPilot}
      >
        {t("homepageCandidateStory.ctaPilot")}
      </Link>
    </div>
  );
}
