/**
 * Production action gates — hide/disable non-LIVE mutations outside demo/dev/internal.
 * Founder block 2026-07-20: no external pilot enrollment.
 * Gate F technical PASS (Option 3).
 * RC1: Pilot READY_FOR_CONTROLLED_PILOT after §24 (on-call + temporary canonical).
 * Launch stays NO-GO · Enrollment OFF · Phase 3B BLOCKED.
 */
export const EXTERNAL_PILOT_ENROLLMENT_ENABLED =
  process.env.NEXT_PUBLIC_EXTERNAL_PILOT_ENROLLMENT_ENABLED === "true";

/** Allowed: BLOCKED_BY_FOUNDER | READY_FOR_CONTROLLED_PILOT | TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE */
export const PILOT_STANCE = "READY_FOR_CONTROLLED_PILOT" as const;
export type PilotStance =
  | "BLOCKED_BY_FOUNDER"
  | "READY_FOR_CONTROLLED_PILOT"
  | "TECHNICALLY_READY_BUT_CUSTOMER_JOURNEY_INCOMPLETE";
/** Stable Vercel production alias while twin.care Afternic NS parks apex. */
export const TEMPORARY_PILOT_CANONICAL_URL = "https://twin-sooty.vercel.app" as const;
/** Honest KPI until a non-synthetic FOUNDER_APPROVED org has SENT invites. */
export const PILOT_KPI_TOKEN = "NO_REAL_PILOT_DATA" as const;
/**
 * Hard LIVE CORE 143 PASS is technical existence only — not customer-usable.
 * See customer-usable-readiness.ts for CUSTOMER_USABLE_PASS denominator.
 */
export const HARD_LIVE_CORE_PASS_IS_TECHNICAL_ONLY = true as const;
export const CUSTOMER_USABLE_MINIMAL_JOURNEY_ID = "recruiter_inbox_accept_decline" as const;
export const CUSTOMER_USABLE_MULTI_ROLE_JOURNEY_ID = "company_recruiter_candidate_pipeline" as const;
export const CONTROLLED_PILOT_OS_VERDICT =
  "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY COMPLETE — READY FOR FIRST APPROVED ORGANIZATION" as const;
export const GATE_F_STATUS = "PASS" as const;
export const LAUNCH_STANCE_CANON = "NO-GO" as const;
export const PMF_EVIDENCE = "INSUFFICIENT_DATA" as const;
export const REAL_CANDIDATE_ENROLLMENT = "NOT_STARTED" as const;
export const REAL_RECRUITER_ENROLLMENT = "NOT_STARTED" as const;
export const PHASE_3B_STANCE = "BLOCKED" as const;

/** True only for local/dev or explicit demo mode — never production LIVE claims. */
export function isDemoOrDevSurface(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_TWIN_DEMO_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_ALLOW_PREVIEW_MUTATIONS === "true") return true;
  return false;
}

/**
 * Non-LIVE surfaces may show UI but must not present enabled production writes
 * unless demo/dev/internal preview flags are on.
 */
export function allowNonLiveProductionMutation(): boolean {
  return isDemoOrDevSurface();
}

export function shouldBlockExternalPilotEnrollment(): boolean {
  return !EXTERNAL_PILOT_ENROLLMENT_ENABLED;
}

export type ProductionActionKind = "live" | "preview_only" | "sample_only" | "fake_integration" | "internal";

export function productionActionLabel(kind: ProductionActionKind): string {
  switch (kind) {
    case "live":
      return "LIVE";
    case "preview_only":
      return "PREVIEW";
    case "sample_only":
      return "SAMPLE";
    case "fake_integration":
      return "NOT LIVE";
    case "internal":
      return "INTERNAL";
    default:
      return "NOT LIVE";
  }
}

/** Never return LIVE for preview/sample/fake kinds. */
export function assertNotLiveBadge(kind: ProductionActionKind): void {
  if (kind !== "live" && kind === ("LIVE" as never)) {
    throw new Error("LIVE badge forbidden for non-live action kind");
  }
}
