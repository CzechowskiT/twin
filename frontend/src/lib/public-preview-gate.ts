/**
 * PP1 — Independent public synthetic preview kill switch.
 * Must NOT flip Launch / enrollment / signup / pilot / invite gates.
 *
 * Enable: PUBLIC_PREVIEW=READ_ONLY_SYNTHETIC (runtime; preferred)
 *   and/or NEXT_PUBLIC_PUBLIC_PREVIEW=READ_ONLY_SYNTHETIC (build-time FE)
 * Disable / rollback: unset or any other value → /preview is not found.
 */

export const PUBLIC_PREVIEW_VALUE = "READ_ONLY_SYNTHETIC" as const;

/** Raw env — prefer runtime PUBLIC_PREVIEW so rollback does not require rebuild. */
export function publicPreviewEnvRaw(): string {
  return (
    process.env.PUBLIC_PREVIEW ||
    process.env.NEXT_PUBLIC_PUBLIC_PREVIEW ||
    ""
  ).trim();
}

/** True only when the independent kill switch is set to the exact activation value. */
export function isPublicPreviewEnabled(): boolean {
  return publicPreviewEnvRaw() === PUBLIC_PREVIEW_VALUE;
}

export type PublicPreviewStatus = "ENABLED" | "READY_INACTIVE";

export function publicPreviewStatus(): PublicPreviewStatus {
  return isPublicPreviewEnabled() ? "ENABLED" : "READY_INACTIVE";
}

/** Stable scenario id allowlist (static fixture only — no runtime lookup). */
export const PUBLIC_PREVIEW_SCENARIO_IDS = ["demo_scenario_v1"] as const;
export type PublicPreviewScenarioId = (typeof PUBLIC_PREVIEW_SCENARIO_IDS)[number];

export function isAllowlistedPreviewScenario(id: string | null | undefined): boolean {
  if (!id) return true; // default scenario
  return (PUBLIC_PREVIEW_SCENARIO_IDS as readonly string[]).includes(id);
}
