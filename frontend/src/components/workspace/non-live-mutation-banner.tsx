"use client";

import { useTranslation } from "@/components/language-provider";
import {
  allowNonLiveProductionMutation,
  PILOT_STANCE,
  shouldBlockExternalPilotEnrollment,
  type ProductionActionKind,
} from "@/lib/production-action-gates";

type Props = {
  kind?: ProductionActionKind;
  /** When true, also remind that external enrollment is blocked. */
  showEnrollmentBlock?: boolean;
};

/**
 * Honest banner for preview/sample/demo surfaces — never claims LIVE.
 * Mutations stay disabled unless demo/dev preview flags are on.
 */
export function NonLiveMutationBanner({
  kind = "preview_only",
  showEnrollmentBlock = false,
}: Props) {
  const { t } = useTranslation();
  const mutationsAllowed = allowNonLiveProductionMutation();

  return (
    <div
      className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100 sm:text-sm"
      role="status"
      data-testid="non-live-mutation-banner"
      data-action-kind={kind}
      data-mutations-allowed={mutationsAllowed ? "1" : "0"}
      data-pilot-stance={PILOT_STANCE}
    >
      <p>{t("productPolish.nonLiveMutationBanner")}</p>
      {!mutationsAllowed ? (
        <p className="mt-1 opacity-90">{t("productPolish.nonLiveMutationDisabled")}</p>
      ) : (
        <p className="mt-1 opacity-90">{t("productPolish.nonLiveMutationDevOnly")}</p>
      )}
      {showEnrollmentBlock && shouldBlockExternalPilotEnrollment() ? (
        <p className="mt-1 font-medium">{t("productPolish.externalEnrollmentBlocked")}</p>
      ) : null}
    </div>
  );
}
