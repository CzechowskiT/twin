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

export function trackHomepageCandidateStory(
  event: HomepageCandidateStoryEvent,
  props?: DemoAnalyticsProps,
) {
  trackEvent(event, { surface: "homepage-candidate", ...props });
}
