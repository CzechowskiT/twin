"use client";

import { Suspense } from "react";

import { LoginZoneForm } from "@/components/auth/login-zone-form";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { INVESTOR_LOGIN_INVITE_ONLY_PREVIEW } from "@/lib/product-polish-p3";

export default function LoginInvestorPage() {
  const { t } = useTranslation();
  return (
    <Shell rail>
      {INVESTOR_LOGIN_INVITE_ONLY_PREVIEW ? (
        <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceStatusBadge status="preview" labelKey="productPolish.investorInviteOnlyBadge" />
          </div>
          <p className="twin-muted mt-3 max-w-xl text-sm leading-relaxed">{t("productPolish.investorInviteOnlyLead")}</p>
        </Card>
      ) : null}
      <Suspense
        fallback={
          <Card>
            <p className="twin-muted text-sm">{t("login.signingIn")}</p>
          </Card>
        }
      >
        <LoginZoneForm zone="investor" />
      </Suspense>
    </Shell>
  );
}
