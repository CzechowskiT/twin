"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DEMO_FIXTURE_BUNDLE } from "@/lib/demo/demo-fixtures";
import { DEMO_CV_META, DEMO_CV_SKILLS, DEMO_CV_TITLES } from "@/lib/demo-walkthrough-data";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";

type DemoSceneStageProps = {
  scene: DemoScene;
  reducedMotion: boolean;
  onCtaDemo?: () => void;
  onCtaPilot?: () => void;
};

export function DemoSceneStage({ scene, reducedMotion, onCtaDemo, onCtaPilot }: DemoSceneStageProps) {
  const { t } = useTranslation();
  const fade = reducedMotion ? "" : "transition-opacity duration-500";

  return (
    <div
      className={`relative min-h-[200px] overflow-hidden rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-4 sm:min-h-[240px] sm:p-5 ${fade}`}
      data-demo-scene={scene.id}
      role="img"
      aria-label={t(scene.titleKey)}
    >
      {scene.id === "intro" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(["candidate", "recruiter", "company"] as const).map((role) => (
            <div key={role} className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {t(`interactiveDemoPlayer.roleLabel_${role}`)}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--twin-fg)]">
                {t(`interactiveDemoPlayer.roleCard_${role}`)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {scene.id === "candidate_pipeline" || scene.id === "hp_compass" ? (
        <ul className="space-y-2">
          {DEMO_FIXTURE_BUNDLE.topJobs.map((job) => (
            <li
              key={job.id}
              className="interactive-demo-match-row flex items-center justify-between gap-3 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-medium text-[var(--twin-fg)]">{job.title}</span>
              <DemoMatchGauge score={job.score} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}

      {scene.id === "recruiter_inbox" ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-[var(--twin-fg)]">{DEMO_FIXTURE_BUNDLE.inboxCandidate.name}</p>
          <p className="text-[var(--twin-muted-strong)]">{DEMO_FIXTURE_BUNDLE.reviewCard.why_this_candidate}</p>
          <div className="flex gap-2 pt-2">
            <span className="rounded-md border border-[var(--twin-border)] px-2 py-1 text-xs">
              {t("interactiveDemoPlayer.stageAccept")}
            </span>
            <span className="rounded-md border border-[var(--twin-border)] px-2 py-1 text-xs opacity-60">
              {t("interactiveDemoPlayer.stageDecline")}
            </span>
          </div>
        </div>
      ) : null}

      {scene.id === "company_memory" ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--twin-muted)]">{t("interactiveDemoPlayer.companyRoles")}</dt>
            <dd className="text-lg font-semibold">{DEMO_FIXTURE_BUNDLE.company.talentMemoryRoles}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--twin-muted)]">{t("interactiveDemoPlayer.companyPipelines")}</dt>
            <dd className="text-lg font-semibold">{DEMO_FIXTURE_BUNDLE.company.activePipelines}</dd>
          </div>
        </dl>
      ) : null}

      {scene.id === "calendar_hold" || scene.id === "hp_timeline" ? (
        <div className="rounded-lg border border-dashed border-[var(--twin-accent)]/40 bg-[var(--twin-surface-soft)] p-4 text-sm">
          <p className="font-medium text-[var(--twin-fg)]">{DEMO_FIXTURE_BUNDLE.calendarSlot.title}</p>
          <p className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_FIXTURE_BUNDLE.calendarSlot.when}</p>
          {scene.id === "hp_timeline" ? (
            <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("interactiveDemo.calendarSimulation")}</p>
          ) : null}
        </div>
      ) : null}

      {scene.id === "hp_start" ? (
        <p className="rounded-xl border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/20 px-4 py-3 text-sm text-[var(--twin-muted-strong)]">
          {t("homepageCandidateStory.scene1Body")}
        </p>
      ) : null}

      {scene.id === "hp_profile" ? (
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border p-3">
            <dt className="font-semibold">{t("demo.cvSkills")}</dt>
            <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_SKILLS.slice(0, 5).join(", ")}</dd>
          </div>
          <div className="rounded-xl border p-3">
            <dt className="font-semibold">{t("demo.cvTitles")}</dt>
            <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_TITLES.slice(0, 2).join(", ")}</dd>
            <dd className="mt-2 text-xs text-[var(--twin-muted)]">
              {DEMO_CV_META.experienceYears} {t("demo.cvYears")} · {DEMO_CV_META.location}
            </dd>
          </div>
        </dl>
      ) : null}

      {scene.id === "hp_trust" ? (
        <ul className="space-y-2 text-sm text-[var(--twin-muted-strong)]">
          <li className="rounded-lg border px-3 py-2">✓ {t("homepageCandidateStory.trustConsent")}</li>
          <li className="rounded-lg border px-3 py-2">✓ {t("homepageCandidateStory.trustExport")}</li>
          <li className="rounded-lg border px-3 py-2">✓ {t("homepageCandidateStory.trustRevoke")}</li>
        </ul>
      ) : null}

      {scene.id === "hp_boundaries" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--twin-muted-strong)]">
          {t("homepageCandidateStory.scene5Body")}
        </p>
      ) : null}

      {scene.id === "hp_cta" ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="section-cta-primary twin-touch-target px-5 text-sm"
            onClick={onCtaDemo}
          >
            {t("homepageCandidateStory.ctaDemo")}
          </Link>
          <Link
            href="/demo#interactive-story"
            className="section-cta-secondary twin-touch-target px-5 text-sm"
            onClick={onCtaPilot}
          >
            {t("homepageCandidateStory.ctaPilot")}
          </Link>
        </div>
      ) : null}

      {(scene.id === "north_star" || scene.id === "trust_boundary" || scene.id === "pilot_cta") && (
        <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t(scene.descriptionKey)}</p>
      )}

      <p className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-[var(--twin-muted)]">
        {t("interactiveDemoPlayer.sampleBadge")}
      </p>
    </div>
  );
}
