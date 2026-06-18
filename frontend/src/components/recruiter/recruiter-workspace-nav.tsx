"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const TABS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/recruiter/daily-cockpit", labelKey: "recruiterDailyCockpit.navLink" },
  { href: "/recruiter/trust-review-queue", labelKey: "recruiterTrustReviewQueue.navLink" },
  { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
  { href: "/recruiter/pipeline", labelKey: "recruiterPipeline.title" },
  { href: "/recruiter/talent-radar", labelKey: "recruiterTalentRadar.navLink" },
  { href: "/recruiter/analytics", labelKey: "recruiterAnalytics.title" },
  { href: "/recruiter/jobs", labelKey: "recruiterJobs.title" },
  { href: "/recruiter/calendar", labelKey: "recruiterCalendar.title" },
  { href: "/recruiter/integrations", labelKey: "recruiterIntegrations.navLink" },
];

export function RecruiterWorkspaceNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      className="recruiter-workspace-nav mb-6 flex flex-wrap gap-2 border-b border-[var(--twin-border)] pb-3"
      aria-label={t("recruiterPipeline.navAria")}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--twin-surface-raised)] text-[var(--foreground)] ring-1 ring-[var(--twin-border)]"
                : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-raised)] hover:text-[var(--foreground)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
