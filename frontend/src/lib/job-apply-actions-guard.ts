import type {
  VerifiedReadinessGate,
  VerifiedReadinessLoadState,
} from "@/hooks/dashboard/use-dashboard-verified-readiness";

/** Frontend guard for job-row apply / prepare actions (readiness + delegated policy). */
export type JobApplyActionsGuard = {
  canPrepareApplicationPackage: boolean;
  canSubmitDelegatedApplication: boolean;
};

export function jobApplyActionsGuardFromReadiness(
  gate: VerifiedReadinessGate | null,
  loadState: VerifiedReadinessLoadState,
): JobApplyActionsGuard {
  const ready = loadState === "ready" && gate != null;
  return {
    canPrepareApplicationPackage: Boolean(ready && gate.can_prepare_application_package),
    canSubmitDelegatedApplication: Boolean(
      ready && gate.delegated_apply_allowed && gate.can_submit_delegated_application,
    ),
  };
}
