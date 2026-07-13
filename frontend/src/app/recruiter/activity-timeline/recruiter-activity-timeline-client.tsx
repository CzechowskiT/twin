"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { readRecruiterInboxSession } from "@/lib/recruiter-inbox";
import {
  RECRUITER_ACTIVITY_TIMELINE_SHIP_STATUS,
  RECRUITER_C5_BROWSER_SMOKE_STATUS,
} from "@/lib/seven-day-c5-recruiter";

type TimelineItem = {
  id: number;
  action_type: string;
  application_id: number;
  created_at: string | null;
};

type TimelineResponse = {
  items: TimelineItem[];
  total: number;
  offset: number;
  limit: number;
};

export function RecruiterActivityTimelineClient() {
  const { t } = useTranslation();
  const [session, setSession] = useState<{ token: string; companySlug: string } | null>(null);
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSession(readRecruiterInboxSession());
  }, []);

  const load = useCallback(async () => {
    if (!session?.token || !session.companySlug) return;
    const params = new URLSearchParams({
      company_slug: session.companySlug,
      token: session.token,
      limit: "50",
    });
    try {
      const res = await apiFetch<TimelineResponse>(`/api/recruiter/activity-timeline?${params}`);
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("recruiterActivityTimeline.loadError"));
    }
  }, [session, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-recruiter-activity-timeline>
      <header>
        <h1 className="text-2xl font-semibold">{t("recruiterActivityTimeline.title")}</h1>
        <p className="twin-muted mt-2 text-sm">{t("recruiterActivityTimeline.lead")}</p>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">
          {RECRUITER_ACTIVITY_TIMELINE_SHIP_STATUS} · {RECRUITER_C5_BROWSER_SMOKE_STATUS}
        </p>
      </header>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <Card variant="soft" className="p-5">
        <ul className="space-y-3" aria-label={t("recruiterActivityTimeline.listAria")}>
          {(data?.items ?? []).map((item) => (
            <li key={item.id} className="border-b border-[var(--twin-border)]/60 pb-3 text-sm">
              <span className="font-medium">{item.action_type}</span>
              <span className="twin-muted ml-2">#{item.application_id}</span>
              <time className="ml-2 text-xs text-[var(--twin-muted-strong)]">{item.created_at}</time>
            </li>
          ))}
          {data && data.items.length === 0 && (
            <li className="text-sm text-[var(--twin-muted-strong)]">{t("recruiterActivityTimeline.empty")}</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
