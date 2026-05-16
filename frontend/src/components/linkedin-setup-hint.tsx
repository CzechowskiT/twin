"use client";

import { useTranslation } from "@/components/language-provider";

export function LinkedInSetupHint() {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <p className="font-semibold">{t("login.linkedInSetupTitle")}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
        <li>{t("login.linkedInSetupStep1")}</li>
        <li>{t("login.linkedInSetupStep2")}</li>
        <li>{t("login.linkedInSetupStep3")}</li>
      </ol>
      <p className="mt-2 text-xs opacity-90">{t("login.linkedInSetupDoc")}</p>
    </div>
  );
}
