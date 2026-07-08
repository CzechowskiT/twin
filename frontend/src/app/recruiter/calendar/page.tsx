"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { Card, Shell } from "@/components/ui";
import { RECRUITER_CALENDAR_ROADMAP_ONLY } from "@/lib/seven-day-d6-integrations";

const QUICK_LINKS = [
  { href: "/recruiter/inbox", labelKey: "recruiterInbox.title", descKey: "recruiterCalendar.linkInboxDesc" },
  { href: "/recruiter/jobs", labelKey: "recruiterJobs.title", descKey: "recruiterCalendar.linkJobsDesc" },
  { href: "/for-recruiters", labelKey: "nav.forRecruiters", descKey: "recruiterCalendar.linkStoryDesc" },
] as const;

/** Recruiter calendar roadmap — not live; avoids candidate /dashboard/calendar login loop. */
export default function RecruiterCalendarPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-3xl" data-seven-day-recruiter-calendar-roadmap>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("recruiterCalendar.eyebrow")}
          </p>
          {RECRUITER_CALENDAR_ROADMAP_ONLY ? <WorkspaceStatusBadge status="coming_soon" /> : null}
        </div>
        <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t("recruiterCalendar.title")}</h1>
        <p className="twin-muted mt-3 text-sm leading-relaxed">{t("recruiterCalendar.lead")}</p>
        <Card variant="soft" className="mt-6 border-[var(--twin-accent)]/20 p-5 sm:p-6" data-seven-day-d6-recruiter-calendar-boundary>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {RECRUITER_CALENDAR_ROADMAP_ONLY
              ? t("sevenDayD6.recruiterCalendarComingSoonTitle")
              : t("recruiterCalendar.notLiveTitle")}
          </p>
          <p className="twin-muted mt-2 text-sm leading-relaxed">
            {RECRUITER_CALENDAR_ROADMAP_ONLY
              ? t("sevenDayD6.recruiterCalendarComingSoonBody")
              : t("recruiterCalendar.notLiveBody")}
          </p>
          <ul className="twin-muted mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>{t("recruiterCalendar.roadmapItem1")}</li>
            <li>{t("recruiterCalendar.roadmapItem2")}</li>
            <li>{t("recruiterCalendar.roadmapItem3")}</li>
          </ul>
        </Card>
        <p className="twin-muted mt-6 text-sm leading-relaxed">{t("recruiterCalendar.pilotHint")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Card key={link.href} variant="soft" className="p-5">
              <Link href={link.href} className="block">
                <p className="font-semibold text-[var(--foreground)]">{t(link.labelKey)}</p>
                <p className="twin-muted mt-2 text-sm leading-relaxed">{t(link.descKey)}</p>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
