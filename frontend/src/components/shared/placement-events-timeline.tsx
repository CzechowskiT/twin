"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { PLACEMENT_EVENTS_TIMELINE_MARKERS } from "@/lib/placement-events";
import {
  loadPlacementEventsTimeline,
  placementEventsTimelineSourceKey,
  type PlacementEventTimelineRow,
  type PlacementEventTimelineSource,
} from "@/lib/placement-events-live";

type Props = {
  placementId?: string;
};

export function PlacementEventsTimeline({ placementId }: Props): ReactNode {
  const { t } = useTranslation();
  const [items, setItems] = useState<PlacementEventTimelineRow[]>([]);
  const [source, setSource] = useState<PlacementEventTimelineSource>("demo");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPlacementEventsTimeline(placementId).then((res) => {
      if (!active) return;
      setItems(res.items);
      setSource(res.source);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [placementId]);

  return (
    <div
      className="rounded-lg border border-[var(--twin-border)]/60 px-4 py-4 text-xs"
      data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.widget}
    >
      <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
        {t("placementEventsTimeline.title")}
      </h2>
      <p className="mt-1 text-[var(--twin-muted)]">{t("placementEventsTimeline.lead")}</p>
      <p
        className="mt-2 rounded border border-[var(--twin-border)]/50 bg-[var(--twin-surface)]/40 px-2 py-1.5 text-[10px] text-[var(--twin-muted-strong)]"
        data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.safety}
      >
        {t("placementEventsTimeline.safetyNote")}
      </p>
      {loaded ? (
        <p
          className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]"
          data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.source}
        >
          {t(placementEventsTimelineSourceKey(source))}
        </p>
      ) : null}
      {source === "partial" ? (
        <p className="mt-1 text-[10px] text-[var(--twin-accent)]" data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.partial}>
          {t("placementEventsTimeline.partialWarning")}
        </p>
      ) : null}
      {loaded && items.length === 0 ? (
        <p className="mt-3 text-[var(--twin-muted)]">{t("placementEventsTimeline.emptyState")}</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2" data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.list}>
          {items.map((row) => (
            <li
              key={String(row.id)}
              className="rounded border border-[var(--twin-border)]/50 px-3 py-2 font-mono text-[10px]"
              data-testid={PLACEMENT_EVENTS_TIMELINE_MARKERS.row}
            >
              <span className="block font-semibold text-[var(--foreground)]">{row.event_type}</span>
              <span className="block text-[var(--twin-muted-strong)]">
                {row.event_status} · {row.actor_persona}
              </span>
              <span className="block text-[var(--twin-muted)]">
                {row.placement_id}
                {row.candidate_id ? ` · ${row.candidate_id}` : ""}
              </span>
              <span className="block text-[var(--twin-muted)]">{row.created_at}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
