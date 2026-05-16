"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";

export default function OnboardingAssistantPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return (
    <Shell>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("onboarding.title")}</h1>
        <p className="twin-muted mb-6 text-sm leading-relaxed">{t("onboarding.body")}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/profile" className="twin-btn-solid twin-touch-target inline-block text-center">
            {t("onboarding.profileLink")}
          </Link>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target px-4 py-2 text-sm"
            onClick={() => router.push("/dashboard")}
          >
            {t("onboarding.dashboardLink")}
          </button>
        </div>
      </Card>
    </Shell>
  );
}
