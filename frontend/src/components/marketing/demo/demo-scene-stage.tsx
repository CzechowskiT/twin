"use client";

import { useTranslation } from "@/components/language-provider";
import {
  DemoCalendarHoldSurface,
  DemoCandidatePipelineSurface,
  DemoCompanyMemorySurface,
  DemoHpBoundariesSurface,
  DemoHpCtaSurface,
  DemoHpProfileSurface,
  DemoHpStartSurface,
  DemoHpTrustSurface,
  DemoIntroSurface,
  DemoNorthStarSurface,
  DemoPilotCtaSurface,
  DemoRecruiterInboxSurface,
  DemoTrustBoundarySurface,
} from "@/components/marketing/demo/demo-scene-surfaces";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";

type DemoSceneStageProps = {
  scene: DemoScene;
  reducedMotion: boolean;
  compact?: boolean;
  onCtaDemo?: () => void;
  onCtaPilot?: () => void;
};

function renderSceneSurface(
  scene: DemoScene,
  compact: boolean | undefined,
  onCtaDemo?: () => void,
  onCtaPilot?: () => void,
) {
  const props = { compact, onCtaDemo, onCtaPilot };
  switch (scene.id) {
    case "intro":
      return <DemoIntroSurface {...props} />;
    case "north_star":
      return <DemoNorthStarSurface {...props} />;
    case "candidate_pipeline":
    case "hp_compass":
      return <DemoCandidatePipelineSurface {...props} />;
    case "recruiter_inbox":
      return <DemoRecruiterInboxSurface {...props} />;
    case "company_memory":
      return <DemoCompanyMemorySurface {...props} />;
    case "calendar_hold":
      return <DemoCalendarHoldSurface {...props} />;
    case "hp_timeline":
      return <DemoCalendarHoldSurface {...props} showSimulationNote />;
    case "trust_boundary":
      return <DemoTrustBoundarySurface {...props} />;
    case "pilot_cta":
      return <DemoPilotCtaSurface {...props} />;
    case "hp_start":
      return <DemoHpStartSurface />;
    case "hp_profile":
      return <DemoHpProfileSurface {...props} />;
    case "hp_trust":
      return <DemoHpTrustSurface {...props} />;
    case "hp_boundaries":
      return <DemoHpBoundariesSurface />;
    case "hp_cta":
      return <DemoHpCtaSurface {...props} />;
    default:
      return null;
  }
}

export function DemoSceneStage({ scene, reducedMotion, compact, onCtaDemo, onCtaPilot }: DemoSceneStageProps) {
  const { t } = useTranslation();
  const fade = reducedMotion ? "" : "transition-opacity duration-500";
  const heightClass = compact
    ? "min-h-[180px] sm:min-h-[220px]"
    : "min-h-[200px] sm:min-h-[240px]";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-3 sm:p-4 ${heightClass} ${fade}`}
      data-demo-scene={scene.id}
      data-testid={`demo-scene-${scene.id}`}
      role="img"
      aria-label={t(scene.titleKey)}
    >
      {renderSceneSurface(scene, compact, onCtaDemo, onCtaPilot)}

      <p className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-[var(--twin-muted)]">
        {t("interactiveDemoPlayer.sampleBadge")}
      </p>
    </div>
  );
}
