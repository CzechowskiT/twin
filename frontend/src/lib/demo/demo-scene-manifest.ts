/**
 * Single source of truth for interactive demo scenes — /demo player, homepage story, video pipeline.
 */
import type { TranslationKey } from "@/lib/i18n";

export type DemoSurface = "full-demo" | "homepage-candidate" | "video-export";

export type DemoRole = "overview" | "candidate" | "recruiter" | "company";

export type DemoCursorPoint = {
  x: number;
  y: number;
};

export type DemoScene = {
  id: string;
  role: DemoRole;
  surfaces: readonly DemoSurface[];
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  durationMs: number;
  highlightKeys: readonly TranslationKey[];
  cursorPath?: readonly DemoCursorPoint[];
  analyticsEvent: string;
  videoSafe: boolean;
  reducedMotionVariant: "static" | "fade";
  bodyKey?: TranslationKey;
};

export type DemoSequenceId =
  | "candidate-homepage-story"
  | "full-product-story"
  | "video-export-homepage"
  | "video-export-full";

export type DemoSequence = {
  id: DemoSequenceId;
  surface: DemoSurface;
  sceneIds: readonly string[];
  targetDurationSec: { min: number; max: number };
};

export const DEMO_OVERVIEW_DURATION_MS = 58_000;
export const DEMO_FULL_DURATION_MS = 108_000;

const mk = (
  id: string,
  role: DemoRole,
  surfaces: readonly DemoSurface[],
  titleKey: TranslationKey,
  descriptionKey: TranslationKey,
  durationMs: number,
  highlightKeys: readonly TranslationKey[],
  analyticsEvent: string,
  cursorPath?: readonly DemoCursorPoint[],
  bodyKey?: TranslationKey,
): DemoScene => ({
  id,
  role,
  surfaces,
  titleKey,
  descriptionKey,
  durationMs,
  highlightKeys,
  cursorPath,
  analyticsEvent,
  videoSafe: true,
  reducedMotionVariant: "fade",
  bodyKey,
});

export const DEMO_SCENES: readonly DemoScene[] = [
  mk(
    "intro",
    "overview",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneIntroTitle",
    "interactiveDemoPlayer.sceneIntroDesc",
    8_000,
    ["interactiveDemoPlayer.sceneIntroH1", "interactiveDemoPlayer.sceneIntroH2"],
    "demo_scene_intro",
    [{ x: 50, y: 42 }, { x: 62, y: 55 }],
  ),
  mk(
    "north_star",
    "overview",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneNorthStarTitle",
    "interactiveDemoPlayer.sceneNorthStarDesc",
    10_000,
    ["interactiveDemoPlayer.sceneNorthStarH1", "interactiveDemoPlayer.sceneNorthStarH2"],
    "demo_scene_north_star",
    [{ x: 28, y: 38 }, { x: 72, y: 62 }],
  ),
  mk(
    "candidate_pipeline",
    "candidate",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneCandidatePipelineTitle",
    "interactiveDemoPlayer.sceneCandidatePipelineDesc",
    12_000,
    ["interactiveDemoPlayer.sceneCandidatePipelineH1", "interactiveDemoPlayer.sceneCandidatePipelineH2"],
    "demo_scene_candidate_pipeline",
    [{ x: 35, y: 48 }, { x: 55, y: 68 }],
  ),
  mk(
    "recruiter_inbox",
    "recruiter",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneRecruiterInboxTitle",
    "interactiveDemoPlayer.sceneRecruiterInboxDesc",
    12_000,
    ["interactiveDemoPlayer.sceneRecruiterInboxH1", "interactiveDemoPlayer.sceneRecruiterInboxH2"],
    "demo_scene_recruiter_inbox",
    [{ x: 68, y: 44 }, { x: 48, y: 72 }],
  ),
  mk(
    "company_memory",
    "company",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneCompanyMemoryTitle",
    "interactiveDemoPlayer.sceneCompanyMemoryDesc",
    10_000,
    ["interactiveDemoPlayer.sceneCompanyMemoryH1", "interactiveDemoPlayer.sceneCompanyMemoryH2"],
    "demo_scene_company_memory",
    [{ x: 42, y: 36 }, { x: 58, y: 58 }],
  ),
  mk(
    "calendar_hold",
    "overview",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneCalendarTitle",
    "interactiveDemoPlayer.sceneCalendarDesc",
    10_000,
    ["interactiveDemoPlayer.sceneCalendarH1", "interactiveDemoPlayer.sceneCalendarH2"],
    "demo_scene_calendar",
    [{ x: 50, y: 52 }, { x: 66, y: 64 }],
  ),
  mk(
    "trust_boundary",
    "overview",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.sceneTrustTitle",
    "interactiveDemoPlayer.sceneTrustDesc",
    8_000,
    ["interactiveDemoPlayer.sceneTrustH1", "interactiveDemoPlayer.sceneTrustH2"],
    "demo_scene_trust",
  ),
  mk(
    "pilot_cta",
    "overview",
    ["full-demo", "video-export"],
    "interactiveDemoPlayer.scenePilotCtaTitle",
    "interactiveDemoPlayer.scenePilotCtaDesc",
    6_000,
    ["interactiveDemoPlayer.scenePilotCtaH1"],
    "demo_scene_pilot_cta",
    [{ x: 50, y: 78 }],
  ),
  mk(
    "hp_start",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene1Title",
    "homepageCandidateStory.scene1Lead",
    5_500,
    ["homepageCandidateStory.scene1Body"],
    "homepage_candidate_story_scene_start",
  ),
  mk(
    "hp_profile",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene2Title",
    "homepageCandidateStory.scene2Lead",
    5_500,
    ["homepageCandidateStory.scene2Body"],
    "homepage_candidate_story_scene_profile",
  ),
  mk(
    "hp_compass",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene3Title",
    "homepageCandidateStory.scene3Lead",
    5_500,
    ["homepageCandidateStory.scene3Body"],
    "homepage_candidate_story_scene_compass",
  ),
  mk(
    "hp_trust",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene4Title",
    "homepageCandidateStory.scene4Lead",
    5_500,
    [
      "homepageCandidateStory.trustConsent",
      "homepageCandidateStory.trustExport",
      "homepageCandidateStory.trustRevoke",
    ],
    "homepage_candidate_story_scene_trust",
  ),
  mk(
    "hp_boundaries",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene5Title",
    "homepageCandidateStory.scene5Lead",
    5_500,
    ["homepageCandidateStory.scene5Body"],
    "homepage_candidate_story_scene_boundaries",
  ),
  mk(
    "hp_timeline",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene6Title",
    "homepageCandidateStory.scene6Lead",
    5_500,
    ["homepageCandidateStory.scene6Body"],
    "homepage_candidate_story_scene_timeline",
  ),
  mk(
    "hp_cta",
    "candidate",
    ["homepage-candidate", "video-export"],
    "homepageCandidateStory.scene7Title",
    "homepageCandidateStory.scene7Lead",
    5_500,
    [],
    "homepage_candidate_story_scene_cta",
  ),
] as const;

export const DEMO_SEQUENCES: Record<DemoSequenceId, DemoSequence> = {
  "candidate-homepage-story": {
    id: "candidate-homepage-story",
    surface: "homepage-candidate",
    sceneIds: ["hp_start", "hp_profile", "hp_compass", "hp_trust", "hp_boundaries", "hp_timeline", "hp_cta"],
    targetDurationSec: { min: 35, max: 60 },
  },
  "full-product-story": {
    id: "full-product-story",
    surface: "full-demo",
    sceneIds: [
      "intro",
      "north_star",
      "candidate_pipeline",
      "recruiter_inbox",
      "company_memory",
      "calendar_hold",
      "trust_boundary",
      "pilot_cta",
    ],
    targetDurationSec: { min: 45, max: 130 },
  },
  "video-export-homepage": {
    id: "video-export-homepage",
    surface: "video-export",
    sceneIds: ["hp_start", "hp_profile", "hp_compass", "hp_trust", "hp_boundaries", "hp_timeline", "hp_cta"],
    targetDurationSec: { min: 35, max: 60 },
  },
  "video-export-full": {
    id: "video-export-full",
    surface: "video-export",
    sceneIds: [
      "intro",
      "north_star",
      "candidate_pipeline",
      "recruiter_inbox",
      "company_memory",
      "calendar_hold",
      "trust_boundary",
      "pilot_cta",
    ],
    targetDurationSec: { min: 45, max: 130 },
  },
};

export const DEMO_ROLE_ORDER: readonly DemoRole[] = ["overview", "candidate", "recruiter", "company"];

export function scenesForRole(role: DemoRole): DemoScene[] {
  const fullDemo = DEMO_SCENES.filter((s) => s.surfaces.includes("full-demo"));
  if (role === "overview") return [...fullDemo];
  return fullDemo.filter((s) => s.role === role || s.role === "overview");
}

export function scenesForSurface(surface: DemoSurface): DemoScene[] {
  return DEMO_SCENES.filter((s) => s.surfaces.includes(surface));
}

export function resolveSequenceScenes(sequenceId: DemoSequenceId): DemoScene[] {
  const seq = DEMO_SEQUENCES[sequenceId];
  return seq.sceneIds
    .map((id) => DEMO_SCENES.find((s) => s.id === id))
    .filter((s): s is DemoScene => Boolean(s));
}

export function totalDurationMs(scenes: readonly DemoScene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationMs, 0);
}

export function sequenceDurationMs(sequenceId: DemoSequenceId): number {
  return totalDurationMs(resolveSequenceScenes(sequenceId));
}

export function sceneById(id: string): DemoScene | undefined {
  return DEMO_SCENES.find((s) => s.id === id);
}

export function validateDemoSceneManifest(): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const scene of DEMO_SCENES) {
    if (ids.has(scene.id)) issues.push(`duplicate scene id: ${scene.id}`);
    ids.add(scene.id);
    if (scene.surfaces.length === 0) issues.push(`${scene.id}: surfaces[] empty`);
    if (scene.durationMs < 3_000) issues.push(`${scene.id}: durationMs < 3000`);
    if (!scene.analyticsEvent) issues.push(`${scene.id}: missing analyticsEvent`);
    if (!scene.videoSafe) issues.push(`${scene.id}: videoSafe must be true for launch`);
  }
  for (const seq of Object.values(DEMO_SEQUENCES)) {
    const ms = sequenceDurationMs(seq.id);
    const sec = ms / 1000;
    if (sec < seq.targetDurationSec.min || sec > seq.targetDurationSec.max) {
      issues.push(`${seq.id}: duration ${sec.toFixed(1)}s outside ${seq.targetDurationSec.min}–${seq.targetDurationSec.max}s`);
    }
    for (const sceneId of seq.sceneIds) {
      if (!sceneById(sceneId)) issues.push(`${seq.id}: unknown scene ${sceneId}`);
    }
  }
  return issues;
}
