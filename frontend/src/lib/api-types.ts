import type { components } from "./api-schema";

/** Public MVP traction strip (`GET /api/v1/public/mvp-stats`). */
export type MvpStatsOut = components["schemas"]["MvpStatsOut"];

/** Authenticated billing plans (`GET /api/v1/billing/plans`). */
export type PlansPublicResponse = components["schemas"]["PlansPublicResponse"];

export type PlanOut = components["schemas"]["PlanOut"];
