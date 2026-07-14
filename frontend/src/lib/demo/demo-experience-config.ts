/**
 * Cinematic /demo experience — role journeys and opening film timing.
 */
import { scenesForRole, type DemoRole, type DemoScene } from "@/lib/demo/demo-scene-manifest";

/** Opening film arc: problem → shift → product (30–45s narrative). */
export const OPENING_FILM_DURATION_MS = 36_000;

/** Role-specific scene order for interactive simulation after the film. */
export function journeyScenes(role: DemoRole): DemoScene[] {
  return scenesForRole(role);
}

/** Per-role chapter labels for analytics branching (no PII). */
export const ROLE_JOURNEY_BRANCHES: Record<DemoRole, readonly string[]> = {
  overview: ["intro", "north_star", "calendar_hold", "trust_boundary", "pilot_cta"],
  candidate: ["candidate_pipeline", "calendar_hold", "trust_boundary"],
  recruiter: ["recruiter_inbox", "calendar_hold", "trust_boundary"],
  company: ["company_memory", "calendar_hold", "trust_boundary"],
};
