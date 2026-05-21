"use client";

import { Suspense } from "react";

import { LoginZoneForm } from "@/components/auth/login-zone-form";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function LoginRecruiterPage() {
  const { t } = useTranslation();
  return (
    <Shell rail>
      <Suspense
        fallback={
          <Card>
            <p className="twin-muted text-sm">{t("login.signingIn")}</p>
          </Card>
        }
      >
        <LoginZoneForm zone="recruiter" />
      </Suspense>
    </Shell>
  );
}
