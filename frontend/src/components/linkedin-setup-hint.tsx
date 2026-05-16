"use client";

import { useTranslation } from "@/components/language-provider";
import { getPublicLinkedInCallbackUrl } from "@/lib/public-api-base";

const LOCAL_CALLBACK = "http://localhost:8000/api/v1/auth/linkedin/callback";

type LinkedInSetupHintProps = {
  /** Register page uses sign-up wording for the title. */
  variant?: "login" | "register";
};

export function LinkedInSetupHint({ variant = "login" }: LinkedInSetupHintProps) {
  const { t } = useTranslation();
  const prodCallback = getPublicLinkedInCallbackUrl();

  const title =
    variant === "register" ? t("register.linkedInSetupTitle") : t("login.linkedInSetupTitle");

  return (
    <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs">
        <li>{t("login.linkedInSetupStep1")}</li>
        <li>
          <p>{t("login.linkedInSetupStep2Intro")}</p>
          <ul className="mt-1.5 list-none space-y-1.5 pl-0 font-mono text-[11px] leading-snug break-all text-amber-950">
            {prodCallback && (
              <li>
                <span className="font-sans text-[11px] text-amber-950">{t("login.linkedInSetupCallbackProd")}</span>
                <div className="mt-0.5 select-all">{prodCallback}</div>
              </li>
            )}
            <li>
              <span className="font-sans text-[11px] text-amber-950">{t("login.linkedInSetupCallbackLocal")}</span>
              <div className="mt-0.5 select-all">{LOCAL_CALLBACK}</div>
            </li>
          </ul>
        </li>
        <li>{t("login.linkedInSetupStep3")}</li>
      </ol>
      <p className="mt-2 text-xs opacity-90">{t("login.linkedInSetupDoc")}</p>
    </div>
  );
}
