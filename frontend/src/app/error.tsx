"use client";

import { useEffect } from "react";

import { useTranslation } from "@/components/language-provider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="twin-container max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">{t("common.errorTitle")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted)]">{t("common.errorBody")}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="twin-btn-solid twin-touch-target mt-8 !w-auto min-w-[10rem] px-6"
      >
        {t("common.tryAgain")}
      </button>
    </div>
  );
}
