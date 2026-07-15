/**
 * Sales demo — video asset paths and role flow config.
 */
import { scenesForRole, totalDurationMs, type DemoRole, type DemoScene } from "@/lib/demo/demo-scene-manifest";

/** Canonical Remotion composition length — ffprobe ~45.056s on rendered MP4. */
export const PRODUCT_FILM_DURATION_SEC = 45;

export type SalesDemoRole = Exclude<DemoRole, "overview">;

export const SALES_ROLE_ORDER: readonly SalesDemoRole[] = ["candidate", "recruiter", "company"];

export function productFilmSources(locale: string): {
  mp4: string;
  webm: string;
  poster: string;
  vtt: string;
} {
  const loc = locale === "pl" ? "pl" : "en";
  const base = `/demo/twin-product-film-${loc}`;
  return {
    mp4: `${base}.mp4`,
    webm: `${base}.webm`,
    poster: `/demo/twin-product-film-poster-${loc}.webp`,
    vtt: `${base}.vtt`,
  };
}

/** Extend role scenes to ~60–75s interactive sales flows. */
export function salesRoleJourneyScenes(role: SalesDemoRole): DemoScene[] {
  const base = scenesForRole(role).filter((s) => s.role === role || s.id === "calendar_hold");
  return base.map((scene) => ({
    ...scene,
    durationMs: Math.round(scene.durationMs * 1.75),
  }));
}

export function salesRoleDurationMs(role: SalesDemoRole): number {
  return totalDurationMs(salesRoleJourneyScenes(role));
}

export const SALES_ROLE_DECISION_SCENE: Record<SalesDemoRole, string> = {
  candidate: "candidate_pipeline",
  recruiter: "recruiter_inbox",
  company: "company_memory",
};
