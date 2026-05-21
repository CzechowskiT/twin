"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

const linkClass =
  "twin-link inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 text-sm font-medium transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)]";

const primaryStackClass =
  "marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-cta)] px-4 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]";

const wishlistStackClass =
  "marketing-cta-filled-pill twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-accent)] px-4 text-sm font-semibold text-[var(--twin-on-accent)] transition hover:bg-[var(--twin-accent-hover)] active:scale-[0.98]";

export function CandidateWorkspaceGate({ surface }: { surface: "dashboard" | "profile" }) {
  const { t } = useTranslation();
  const { persona, setPersona } = useMarketingPersona();
  const router = useRouter();
  const pathname = usePathname();

  if (persona === "candidate") {
    return null;
  }

  const titleKey =
    persona === "company" ? "dashboard.workspaceGateTitleCompany" : "dashboard.workspaceGateTitleRecruiter";
  const leadKey =
    persona === "company" ? "dashboard.workspaceGateLeadCompany" : "dashboard.workspaceGateLeadRecruiter";

  const goCandidate = () => {
    setPersona("candidate");
    router.replace(surface === "profile" ? "/profile" : "/dashboard");
  };

  return (
    <Shell wide>
      <Card variant="soft" className="p-6 sm:p-8">
        <div className="marketing-hero-rail text-start">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("nav.ariaPersonaNav")}: {t(persona === "company" ? "nav.personaCompany" : "nav.personaRecruiter")}
        </p>
        <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(titleKey)}</h1>
        {surface === "profile" ? (
          <p className="twin-muted mt-1 text-sm font-medium">{t("dashboard.workspaceGateSurfaceProfile")}</p>
        ) : null}
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t(leadKey)}</p>
        {surface === "dashboard" && pathname !== "/dashboard" ? (
          <p className="twin-muted mt-3 text-sm">
            {t("dashboard.workspaceGateSubpathNotice").replace("{path}", pathname)}
          </p>
        ) : null}

        {persona === "company" ? (
          <div className="marketing-cta-stack mt-8">
            <Link href="/calculator/b2b" className={primaryStackClass}>
              {t("dashboard.workspaceGateLinkB2bCalculator")}
            </Link>
            <Link href="/waitlist" className={wishlistStackClass}>
              {t("home.joinWishlist")}
            </Link>
          </div>
        ) : null}

        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.workspaceGateExploreHeading")}
          </p>
          <div className="mt-3 flex max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap">
            <Link href="/for-recruiters" className={`${linkClass} sm:!w-auto`}>
              {t("dashboard.workspaceGateLinkForRecruiters")}
            </Link>
            <Link href="/for-companies" className={`${linkClass} sm:!w-auto`}>
              {t("dashboard.workspaceGateLinkForCompanies")}
            </Link>
            <Link href="/contact" className={`${linkClass} sm:!w-auto`}>
              {t("dashboard.workspaceGateLinkContact")}
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--twin-border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="twin-btn-solid twin-touch-target w-full sm:w-auto"
            onClick={goCandidate}
          >
            {t("dashboard.workspaceGateSwitchCta")}
          </button>
          <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:max-w-md">
            {t("dashboard.workspaceGateSwitchHint")}
          </p>
        </div>
        </div>
      </Card>
    </Shell>
  );
}
