/**
 * Demo analytics — /demo player + homepage candidate story events.
 */
import { trackEvent } from "@/lib/analytics";
import type { DemoRole } from "@/lib/demo/demo-scene-manifest";

export type HomepageCandidateStoryEvent =
  | "homepage_candidate_story_view"
  | "homepage_candidate_story_autoplay_start"
  | "homepage_candidate_story_autoplay_pause"
  | "homepage_candidate_story_scene_change"
  | "homepage_candidate_story_skip_animation"
  | "homepage_candidate_story_read_story"
  | "homepage_candidate_story_cta_demo"
  | "homepage_candidate_story_cta_pilot";

type DemoAnalyticsProps = Record<string, string | number | boolean>;

export function trackDemoViewed(props?: DemoAnalyticsProps) {
  trackEvent("demo_viewed", props);
}

export function trackDemoStarted(props?: DemoAnalyticsProps) {
  trackEvent("demo_started", props);
}

export function trackDemoCompleted(props?: DemoAnalyticsProps) {
  trackEvent("demo_completed", props);
}

export function trackDemoScene(props: { scene_id: string } & DemoAnalyticsProps) {
  trackEvent("demo_scene", props);
}

export function trackDemoRoleSelected(role: DemoRole) {
  trackEvent("demo_role_selected", { role });
}

export function trackDemoSceneViewed(props: { scene_id: string } & DemoAnalyticsProps) {
  trackEvent("demo_scene_viewed", props);
}

export function trackDemoCtaClicked(props: { cta_id: string; role: string } & DemoAnalyticsProps) {
  trackEvent("demo_cta_clicked", props);
}

export function trackDemoFilmStarted(props?: DemoAnalyticsProps) {
  trackEvent("demo_film_started", props);
}

export function trackDemoFilmCompleted(props?: DemoAnalyticsProps) {
  trackEvent("demo_film_completed", props);
}

/** Sales demo — real video player events (no PII). */
export function trackDemoVideoImpression(props?: DemoAnalyticsProps) {
  trackEvent("demo_video_impression", props);
}

export function trackDemoVideoPlay(props?: DemoAnalyticsProps) {
  trackEvent("demo_video_play", props);
}

export function trackDemoVideoPause(props?: DemoAnalyticsProps) {
  trackEvent("demo_video_pause", props);
}

export function trackDemoVideoProgress(props: { progress: number } & DemoAnalyticsProps) {
  const event =
    props.progress === 0.25
      ? "demo_video_25"
      : props.progress === 0.5
        ? "demo_video_50"
        : "demo_video_75";
  trackEvent(event, props);
}

export function trackDemoVideoComplete(props?: DemoAnalyticsProps) {
  trackEvent("demo_video_complete", props);
}

export function trackDemoVideoSkip(props?: DemoAnalyticsProps) {
  trackEvent("demo_video_skip", props);
}

export function trackDemoRoleSelect(props: { role: string } & DemoAnalyticsProps) {
  trackEvent("demo_role_select", props);
}

export function trackDemoInteraction(props: { action: string } & DemoAnalyticsProps) {
  trackEvent("demo_interaction", props);
}

export function trackDemoOutcome(props: { role: string; outcome: string } & DemoAnalyticsProps) {
  trackEvent("demo_outcome", props);
}

export function trackDemoCtaClick(props: { cta_id: string } & DemoAnalyticsProps) {
  trackEvent("demo_cta_click", props);
}

export function trackHomepageCandidateStory(
  event: HomepageCandidateStoryEvent,
  props?: DemoAnalyticsProps,
) {
  trackEvent(event, { surface: "homepage-candidate", ...props });
}
