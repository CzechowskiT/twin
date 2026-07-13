"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import {
  CANDIDATE_ACTIVITY_TIMELINE_BROWSER_SMOKE_STATUS,
  CANDIDATE_ACTIVITY_TIMELINE_SHIP_STATUS,
} from "@/lib/candidate-activity-timeline";
import { TRUST_AUDIT_EVENTS_API_PATH } from "@/lib/candidate-trust-api";

type AuditItem = { id: number; event_type: string; created_at: string | null };

export function CandidateActivityTimelineClient() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: AuditItem[] }>(`${TRUST_AUDIT_EVENTS_API_PATH}?limit=50`);
      setItems(res.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("candidateActivityTimeline.loadError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" data-candidate-activity-timeline>
      <header>
        <h1 className="text-2xl font-semibold">{t("candidateActivityTimeline.title")}</h1>
        <p className="twin-muted mt-2 text-sm">{t("candidateActivityTimeline.lead")}</p>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">
          {CANDIDATE_ACTIVITY_TIMELINE_SHIP_STATUS} · {CANDIDATE_ACTIVITY_TIMELINE_BROWSER_SMOKE_STATUS}
        </p>
      </header>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <Card variant="soft" className="p-5">
        <ul className="space-y-3" aria-label={t("candidateActivityTimeline.listAria")}>
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <span className="font-medium">{item.event_type}</span>
              <time className="ml-2 text-xs text-[var(--twin-muted-strong)]">{item.created_at}</time>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-[var(--twin-muted-strong)]">{t("candidateActivityTimeline.empty")}</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
