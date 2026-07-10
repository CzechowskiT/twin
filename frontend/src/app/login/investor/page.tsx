"use client";

import Link from "next/link";
import { Suspense } from "react";

import { LoginZoneForm } from "@/components/auth/login-zone-form";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
import { INVESTOR_LOGIN_INVITE_ONLY_PREVIEW } from "@/lib/product-polish-p3";
import {
  INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  INVESTOR_PUBLIC_LOGIN_ROADMAP_STATUS,
} from "@/lib/seven-day-d5-investor";

const DECK_MAIL = "contact@twin.care";

export default function LoginInvestorPage() {
  const { t } = useTranslation();
  const requestHref = `mailto:${DECK_MAIL}?subject=${encodeURIComponent(t("investorLogin.requestAccessMailSubject"))}`;

  return (
    <Shell rail>
      {INVESTOR_LOGIN_INVITE_ONLY_PREVIEW ? (
        <Card
          variant="soft"
          className="mb-6 border-[var(--twin-border)]/80 p-5"
          data-wave3-investor-public-login-roadmap
        >
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceStatusBadge status="preview" labelKey="productPolish.investorInviteOnlyBadge" />
            {INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
              <WorkspaceStatusBadge status={INVESTOR_PUBLIC_LOGIN_ROADMAP_STATUS} labelKey="investorLogin.roadmapBadge" />
            ) : null}
          </div>
          <p className="twin-muted mt-3 max-w-xl text-sm leading-relaxed">{t("productPolish.investorInviteOnlyLead")}</p>
          {INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
            <>
              <p className="twin-muted mt-3 max-w-xl text-sm leading-relaxed" data-wave3-investor-login-outside-workspace>
                {t("investorLogin.outsideWorkspaceNote")}
              </p>
              <p className="twin-muted mt-2 max-w-xl text-sm leading-relaxed">{t("investorLogin.noPublicSelfServiceBody")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={requestHref}
                  className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-5 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)]"
                >
                  {t("investorLogin.requestAccessCta")}
                </Link>
                <Link
                  href="/contact"
                  className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-5 text-sm font-semibold text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-border-hover)]"
                >
                  {t("investorLogin.contactFounderCta")}
                </Link>
                <Link href={INVESTOR_LOGIN_ROADMAP_OUTSIDE_HREF} className="twin-link self-center text-sm font-medium">
                  {t("investorLogin.roadmapLink")}
                </Link>
              </div>
            </>
          ) : null}
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
