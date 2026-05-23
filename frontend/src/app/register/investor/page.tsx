"use client";

import { Suspense } from "react";

import { RegisterZoneForm } from "@/components/auth/register-zone-form";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export default function RegisterInvestorPage() {
  const { t } = useTranslation();
  return (
    <Shell rail>
      <Suspense
        fallback={
          <Card>
            <p className="twin-muted text-sm">{t("register.creating")}</p>
          </Card>
        }
      >
        <RegisterZoneForm zone="investor" />
      </Suspense>
    </Shell>
  );
}
